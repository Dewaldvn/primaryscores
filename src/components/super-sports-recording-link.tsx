import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/brand/sss-recording.png";

export function SuperSportsRecordingLink({
  href,
  className,
  children,
}: {
  href: string | null | undefined;
  className?: string;
  children?: ReactNode;
}) {
  const url = href?.trim();
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-2 text-left text-primary underline-offset-4 hover:underline",
        className
      )}
    >
      <Image
        src={LOGO_SRC}
        alt="SuperSport Schools"
        width={31}
        height={31}
        className="size-[31px] shrink-0 object-contain"
      />
      <span className="min-w-0 break-words leading-snug">
        {children ?? "Super Sports Schools recording"}
      </span>
    </a>
  );
}
