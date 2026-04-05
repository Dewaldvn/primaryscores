import { getSchoolLogoPublicUrl } from "@/lib/school-logo";
import { cn } from "@/lib/utils";

const sizeClass = {
  /** Inline / dense tables */
  xs: "size-6",
  /** List rows, cards */
  sm: "size-8",
  /** Standard list emphasis */
  md: "size-10",
  /** Match headers, detail rows */
  lg: "size-14 sm:size-16",
  /** Hero school page title */
  xl: "size-16 sm:size-20 md:size-24",
} as const;

export type SchoolLogoSize = keyof typeof sizeClass;

export function SchoolLogo({
  logoPath,
  alt,
  size = "sm",
  className,
}: {
  logoPath: string | null | undefined;
  alt: string;
  size?: SchoolLogoSize;
  className?: string;
}) {
  const url = getSchoolLogoPublicUrl(logoPath);
  const box = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ring-1 ring-border",
    sizeClass[size],
    className
  );

  if (!url) {
    return (
      <span className={box} aria-hidden>
        <span className="text-[10px] font-medium text-muted-foreground">?</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Public Supabase URLs vary per project; <img> avoids remotePatterns config.
    <img
      src={url}
      alt={alt}
      className={cn(box, "object-contain")}
      loading="lazy"
    />
  );
}
