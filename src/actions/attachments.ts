"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, submissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  submissionId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

export async function registerAttachmentAction(input: unknown) {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid attachment payload" };
  }

  const [sub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, parsed.data.submissionId))
    .limit(1);

  if (!sub || sub.submittedByUserId !== user.id) {
    return { ok: false as const, error: "Not allowed" };
  }

  await db.insert(attachments).values({
    submissionId: parsed.data.submissionId,
    filePath: parsed.data.filePath,
    fileName: parsed.data.fileName,
    mimeType: parsed.data.mimeType,
  });

  return { ok: true as const };
}
