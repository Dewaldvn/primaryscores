import { cn } from "@/lib/utils";

const box = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
} as const;

export type ProfileAvatarSize = keyof typeof box;

export function ProfileAvatar({
  avatarUrl,
  displayName,
  size = "sm",
  className,
}: {
  avatarUrl: string | null | undefined;
  displayName: string;
  size?: ProfileAvatarSize;
  className?: string;
}) {
  const initial = (displayName.trim().charAt(0) || "?").toUpperCase();
  const ring = "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-semibold uppercase text-muted-foreground ring-1 ring-border";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- public Supabase URLs vary per project.
      <img
        src={avatarUrl}
        alt=""
        className={cn(ring, "object-cover", box[size], className)}
        loading="lazy"
      />
    );
  }

  return (
    <span className={cn(ring, box[size], className)} aria-hidden>
      {initial}
    </span>
  );
}
