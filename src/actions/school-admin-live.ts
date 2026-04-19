"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { liveSessions } from "@/db/schema";
import { deleteLiveSessionById } from "@/lib/data/live-sessions";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { liveScheduleInputSchema, runLiveSessionSchedule } from "@/lib/live-session-schedule";
import { adminLiveSessionIdSchema } from "@/lib/validators/live";

export async function schoolAdminScheduleLiveSessionAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = liveScheduleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const managed = await getActiveManagedSchoolIds(profile.id);
  if (managed.length === 0) {
    return { ok: false as const, error: "You need an approved school link first." };
  }

  const result = await runLiveSessionSchedule(parsed.data, profile.id, managed);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/school-admin/schedule-live");
  revalidatePath("/admin/schedule-live");
  return {
    ok: true as const,
    sessionId: result.sessionId,
    scheduled: result.scheduled,
  };
}

export async function schoolAdminCancelScheduledLiveSessionAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN", "ADMIN"]);
  const parsed = adminLiveSessionIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid session." };
  }

  const sessionId = parsed.data.sessionId;
  const [ls] = await db
    .select({
      id: liveSessions.id,
      status: liveSessions.status,
      createdByUserId: liveSessions.createdByUserId,
    })
    .from(liveSessions)
    .where(and(eq(liveSessions.id, sessionId), eq(liveSessions.status, "SCHEDULED")))
    .limit(1);

  if (!ls || ls.createdByUserId !== profile.id) {
    return { ok: false as const, error: "You can only cancel your own scheduled games." };
  }

  const res = await deleteLiveSessionById(sessionId);
  if (!res.ok) {
    return { ok: false as const, error: res.error };
  }
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/school-admin/schedule-live");
  revalidatePath("/admin/schedule-live");
  return { ok: true as const };
}
