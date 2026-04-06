import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions, attachments, profiles } from "@/db/schema";

const openStatuses = ["PENDING", "NEEDS_REVIEW"] as const;

export async function listOpenSubmissions() {
  return db
    .select({
      submission: submissions,
      submitterEmail: profiles.email,
      submitterName: profiles.displayName,
    })
    .from(submissions)
    .leftJoin(profiles, eq(submissions.submittedByUserId, profiles.id))
    .where(inArray(submissions.moderationStatus, [...openStatuses]))
    .orderBy(asc(submissions.submittedAt));
}

export async function getSubmissionWithAttachments(id: string) {
  const [sub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  if (!sub) return null;
  const atts = await db
    .select()
    .from(attachments)
    .where(eq(attachments.submissionId, id));
  return { submission: sub, attachments: atts };
}

export async function moderatorSummary() {
  const [pendingRow] = await db
    .select({ n: count() })
    .from(submissions)
    .where(eq(submissions.moderationStatus, "PENDING"));

  const [needsRow] = await db
    .select({ n: count() })
    .from(submissions)
    .where(eq(submissions.moderationStatus, "NEEDS_REVIEW"));

  const [disputeRow] = await db
    .select({ n: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.moderationStatus, "PENDING"),
        sql`${submissions.notes} ilike 'DISPUTE:%'`
      )
    );

  const [todayRow] = await db
    .select({ n: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.moderationStatus, "PENDING"),
        sql`date(${submissions.submittedAt}) = current_date`
      )
    );

  return {
    // Disputes are displayed/treated as "Needs review" in the UI.
    pending: (pendingRow?.n ?? 0) - (disputeRow?.n ?? 0),
    needsReview: (needsRow?.n ?? 0) + (disputeRow?.n ?? 0),
    submittedToday: todayRow?.n ?? 0,
  };
}
