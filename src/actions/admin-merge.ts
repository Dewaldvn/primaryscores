"use server";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  fixtures,
  profileFavouriteSchools,
  profileFavouriteTeams,
  profileTeamLinks,
  schools,
  submissions,
  teams,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";

const mergeSchoolInputSchema = z.object({
  sourceSchoolId: z.string().uuid(),
  targetSchoolId: z.string().uuid(),
  chooseSourceFields: z.array(
    z.enum(["officialName", "displayName", "nickname", "provinceId", "town", "website", "active", "schoolType", "logoPath"]),
  ),
  selectedSourceTeamIds: z.array(z.string().uuid()),
  deleteSourceWhenDone: z.coerce.boolean().optional().default(false),
});

export async function mergeSchoolsAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = mergeSchoolInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  if (v.sourceSchoolId === v.targetSchoolId) {
    return { ok: false as const, error: "Select two different schools." };
  }

  const selectedTeamIds = Array.from(new Set(v.selectedSourceTeamIds));
  const chooseSource = new Set(v.chooseSourceFields);
  const now = new Date();

  return db.transaction(async (tx) => {
    async function mergeSourceTeamIntoTargetTeam(sourceTeamId: string, targetTeamId: string) {
      await tx.update(fixtures).set({ homeTeamId: targetTeamId }).where(eq(fixtures.homeTeamId, sourceTeamId));
      await tx.update(fixtures).set({ awayTeamId: targetTeamId }).where(eq(fixtures.awayTeamId, sourceTeamId));
      await tx
        .update(submissions)
        .set({ proposedHomeTeamId: targetTeamId })
        .where(eq(submissions.proposedHomeTeamId, sourceTeamId));
      await tx
        .update(submissions)
        .set({ proposedAwayTeamId: targetTeamId })
        .where(eq(submissions.proposedAwayTeamId, sourceTeamId));

      await tx.execute(sql`
        insert into public.profile_favourite_teams (profile_id, team_id, created_at)
        select p.profile_id, ${targetTeamId}::uuid, p.created_at
        from public.profile_favourite_teams p
        where p.team_id = ${sourceTeamId}::uuid
        on conflict (profile_id, team_id) do nothing
      `);
      await tx.delete(profileFavouriteTeams).where(eq(profileFavouriteTeams.teamId, sourceTeamId));

      await tx.execute(sql`
        insert into public.profile_team_links (profile_id, team_id, created_at, created_by_profile_id)
        select l.profile_id, ${targetTeamId}::uuid, l.created_at, l.created_by_profile_id
        from public.profile_team_links l
        where l.team_id = ${sourceTeamId}::uuid
        on conflict (profile_id, team_id) do nothing
      `);
      await tx.delete(profileTeamLinks).where(eq(profileTeamLinks.teamId, sourceTeamId));

      await tx.delete(teams).where(eq(teams.id, sourceTeamId));
    }

    const [sourceSchool] = await tx
      .select()
      .from(schools)
      .where(eq(schools.id, v.sourceSchoolId))
      .limit(1);
    const [targetSchool] = await tx
      .select()
      .from(schools)
      .where(eq(schools.id, v.targetSchoolId))
      .limit(1);
    if (!sourceSchool || !targetSchool) {
      return { ok: false as const, error: "Source or target school could not be found." };
    }

    await tx
      .update(schools)
      .set({
        officialName: chooseSource.has("officialName") ? sourceSchool.officialName : targetSchool.officialName,
        displayName: chooseSource.has("displayName") ? sourceSchool.displayName : targetSchool.displayName,
        nickname: chooseSource.has("nickname") ? sourceSchool.nickname : targetSchool.nickname,
        provinceId: chooseSource.has("provinceId") ? sourceSchool.provinceId : targetSchool.provinceId,
        town: chooseSource.has("town") ? sourceSchool.town : targetSchool.town,
        website: chooseSource.has("website") ? sourceSchool.website : targetSchool.website,
        active: chooseSource.has("active") ? sourceSchool.active : targetSchool.active,
        schoolType: chooseSource.has("schoolType") ? sourceSchool.schoolType : targetSchool.schoolType,
        logoPath: chooseSource.has("logoPath") ? sourceSchool.logoPath : targetSchool.logoPath,
        updatedAt: now,
      })
      .where(eq(schools.id, targetSchool.id));

    if (selectedTeamIds.length === 0) {
      const remainingSourceTeams = v.deleteSourceWhenDone
        ? await tx
            .select({
              id: teams.id,
              sport: teams.sport,
              ageGroup: teams.ageGroup,
              gender: teams.gender,
              teamLabel: teams.teamLabel,
            })
            .from(teams)
            .where(eq(teams.schoolId, sourceSchool.id))
            .orderBy(asc(teams.sport), asc(teams.ageGroup), asc(teams.teamLabel))
        : [];
      revalidatePath("/admin/merge");
      revalidatePath("/admin/teams");
      return {
        ok: true as const,
        mergedTeamCount: 0,
        skippedConflictTeamCount: 0,
        skippedConflictTeamIds: [] as string[],
        sourceDeleted: false,
        deleteMessage: v.deleteSourceWhenDone
          ? remainingSourceTeams.length > 0
            ? "Source school still has teams. Delete/move them first, then try deletion again."
            : "Source school was not deleted because no teams were moved in this run."
          : undefined,
        remainingSourceTeams,
      };
    }

    const sourceTeams = await tx
      .select()
      .from(teams)
      .where(and(eq(teams.schoolId, sourceSchool.id), inArray(teams.id, selectedTeamIds)));

    const moved: string[] = [];
    const skipped: string[] = [];
    const mergedSimilar: string[] = [];

    for (const team of sourceTeams) {
      const [conflict] = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(
          and(
            eq(teams.schoolId, targetSchool.id),
            eq(teams.sport, team.sport),
            eq(teams.ageGroup, team.ageGroup),
            sql`upper(${teams.teamLabel}) = upper(${team.teamLabel})`,
            sql`${teams.gender} is not distinct from ${team.gender}`,
          ),
        )
        .limit(1);
      if (conflict) {
        await mergeSourceTeamIntoTargetTeam(team.id, conflict.id);
        mergedSimilar.push(team.id);
        continue;
      }

      await tx
        .update(teams)
        .set({ schoolId: targetSchool.id, updatedAt: now })
        .where(eq(teams.id, team.id));
      moved.push(team.id);
    }

    let sourceDeleted = false;
    let deleteMessage: string | undefined;
    let remainingSourceTeams: Array<{
      id: string;
      sport: string;
      ageGroup: string;
      gender: string | null;
      teamLabel: string;
    }> = [];
    if (v.deleteSourceWhenDone) {
      const hasRemainingTeams = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.schoolId, sourceSchool.id))
        .limit(1);

      if (hasRemainingTeams.length > 0) {
        remainingSourceTeams = await tx
          .select({
            id: teams.id,
            sport: teams.sport,
            ageGroup: teams.ageGroup,
            gender: teams.gender,
            teamLabel: teams.teamLabel,
          })
          .from(teams)
          .where(eq(teams.schoolId, sourceSchool.id))
          .orderBy(asc(teams.sport), asc(teams.ageGroup), asc(teams.teamLabel));
        deleteMessage = "Source school still has teams. Move or remove them first, then delete.";
      } else {
        // This table does not cascade on school delete; clear manually.
        await tx.delete(profileFavouriteSchools).where(eq(profileFavouriteSchools.schoolId, sourceSchool.id));
        try {
          const deleted = await tx.delete(schools).where(eq(schools.id, sourceSchool.id)).returning({ id: schools.id });
          sourceDeleted = deleted.length > 0;
          if (!sourceDeleted) deleteMessage = "Source school could not be deleted.";
        } catch {
          deleteMessage = "Source school could not be deleted due to remaining linked records.";
        }
      }
    }

    revalidatePath("/admin/merge");
    revalidatePath("/admin/teams");
    revalidatePath("/admin/schools");
    revalidatePath(`/admin/schools/${sourceSchool.id}`);
    revalidatePath(`/admin/schools/${targetSchool.id}`);
    return {
      ok: true as const,
      mergedTeamCount: moved.length,
      skippedConflictTeamCount: skipped.length,
      skippedConflictTeamIds: skipped,
      mergedSimilarTeamCount: mergedSimilar.length,
      sourceDeleted,
      deleteMessage,
      remainingSourceTeams,
    };
  });
}
