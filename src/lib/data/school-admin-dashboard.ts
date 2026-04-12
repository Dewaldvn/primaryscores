import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles, schoolAdminMemberships, schools } from "@/db/schema";

export type SchoolAdminMembershipRow = {
  id: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  requestedAt: Date;
  decidedAt: Date | null;
  schoolId: string;
  schoolDisplayName: string;
  schoolSlug: string;
};

export async function listMembershipsForProfile(
  profileId: string,
): Promise<SchoolAdminMembershipRow[]> {
  return db
    .select({
      id: schoolAdminMemberships.id,
      status: schoolAdminMemberships.status,
      requestedAt: schoolAdminMemberships.requestedAt,
      decidedAt: schoolAdminMemberships.decidedAt,
      schoolId: schools.id,
      schoolDisplayName: schools.displayName,
      schoolSlug: schools.slug,
    })
    .from(schoolAdminMemberships)
    .innerJoin(schools, eq(schoolAdminMemberships.schoolId, schools.id))
    .where(eq(schoolAdminMemberships.profileId, profileId))
    .orderBy(desc(schoolAdminMemberships.requestedAt));
}

export type PendingSchoolAdminClaimRow = {
  membershipId: string;
  requestedAt: Date;
  profileId: string;
  profileEmail: string;
  profileDisplayName: string;
  schoolId: string;
  schoolDisplayName: string;
};

export async function listPendingSchoolAdminClaims(): Promise<PendingSchoolAdminClaimRow[]> {
  return db
    .select({
      membershipId: schoolAdminMemberships.id,
      requestedAt: schoolAdminMemberships.requestedAt,
      profileId: profiles.id,
      profileEmail: profiles.email,
      profileDisplayName: profiles.displayName,
      schoolId: schools.id,
      schoolDisplayName: schools.displayName,
    })
    .from(schoolAdminMemberships)
    .innerJoin(profiles, eq(schoolAdminMemberships.profileId, profiles.id))
    .innerJoin(schools, eq(schoolAdminMemberships.schoolId, schools.id))
    .where(eq(schoolAdminMemberships.status, "PENDING"))
    .orderBy(desc(schoolAdminMemberships.requestedAt));
}
