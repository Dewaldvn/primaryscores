import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/db/schema";

export async function getSubmissionsForUser(userId: string) {
  return db
    .select()
    .from(submissions)
    .where(eq(submissions.submittedByUserId, userId))
    .orderBy(desc(submissions.submittedAt));
}
