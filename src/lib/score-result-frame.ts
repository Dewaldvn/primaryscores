import { cn } from "@/lib/utils";

/**
 * Live scoreboards & verified result highlights — gold frame using `--accent-border` (readable on light/dark).
 */
export const SCORE_RESULT_FRAME_CLASS = "border-[1.28px] border-solid border-accent-border ring-0";

export const SCORE_RESULT_FRAME_DASHED_CLASS = "border-[1.28px] border-dashed border-accent-border ring-0";

/** Light purple surface for dummy / test data. `!` overrides shadcn `Card`’s `bg-card`. (OKLCH) */
export const SCORE_DUMMY_RESULT_BG_CLASS =
  "!bg-[oklch(0.88_0.12_300)] dark:!bg-[oklch(0.30_0.12_300)]";

/** Header strip on list score cards: stays visibly purple (replaces `bg-muted/30`). */
export const SCORE_DUMMY_HEADER_BAND_CLASS =
  "border-b border-border/50 !bg-[oklch(0.86_0.1_300/0.95)] dark:!bg-[oklch(0.28_0.1_300/0.8)]";

export function scoreResultCardClass(isDummy?: boolean | null): string {
  return cn(SCORE_RESULT_FRAME_CLASS, isDummy && SCORE_DUMMY_RESULT_BG_CLASS);
}

export function scoreResultCardHoverClass(isDummy?: boolean | null): string {
  return isDummy
    ? "hover:brightness-[0.99] dark:hover:brightness-[1.03]"
    : "hover:bg-muted/20";
}
