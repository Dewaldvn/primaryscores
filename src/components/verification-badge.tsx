import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, FileWarning, ShieldCheck } from "lucide-react";

const levelCopy: Record<string, { label: string; className: string }> = {
  SUBMITTED: {
    label: "Submitted",
    className: "bg-muted text-muted-foreground",
  },
  MODERATOR_VERIFIED: {
    label: "Moderator verified",
    className: "bg-emerald-700/15 text-emerald-800 dark:text-emerald-400",
  },
  SOURCE_VERIFIED: {
    label: "Source verified",
    className: "bg-teal-700/15 text-teal-900 dark:text-teal-300",
  },
};

export function VerificationBadge({
  level,
  compact,
  isDummy,
}: {
  level: string;
  compact?: boolean;
  /** When true, show test-data label in red (not the usual verification state). */
  isDummy?: boolean;
}) {
  if (isDummy) {
    if (compact) {
      return (
        <span
          className="inline-block max-w-[5.5rem] rounded border border-destructive/50 bg-destructive/10 px-1.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-destructive"
          title="Dummy / test data"
        >
          Dummy Data
        </span>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="border border-destructive/50 bg-destructive/10 font-normal text-destructive"
      >
        Dummy Data
      </Badge>
    );
  }

  const cfg = levelCopy[level] ?? levelCopy.SUBMITTED;
  if (compact) {
    return (
      <span title={cfg.label} className="inline-flex">
        {level === "SOURCE_VERIFIED" ? (
          <ShieldCheck className="size-4 text-teal-700" aria-label={cfg.label} />
        ) : level === "MODERATOR_VERIFIED" ? (
          <CheckCircle2 className="size-4 text-emerald-700" aria-label={cfg.label} />
        ) : (
          <FileWarning className="size-4 text-muted-foreground" aria-label={cfg.label} />
        )}
      </span>
    );
  }
  return (
    <Badge variant="secondary" className={cn("font-normal", cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

export function ModerationStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
    REJECTED: "bg-destructive/15 text-destructive",
    NEEDS_REVIEW: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  };
  return (
    <Badge variant="secondary" className={cn("font-normal", map[status] ?? "")}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
