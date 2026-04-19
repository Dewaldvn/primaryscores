"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { liveScheduleInputSchema, runLiveSessionSchedule } from "@/lib/live-session-schedule";

export async function adminScheduleLiveSessionAction(input: unknown) {
  const { profile } = await requireRole(["ADMIN"]);
  const parsed = liveScheduleInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await runLiveSessionSchedule(parsed.data, profile.id, null);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/admin/schedule-live");
  return {
    ok: true as const,
    sessionId: result.sessionId,
    scheduled: result.scheduled,
  };
}
