import Image from "next/image";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";
import { cn } from "@/lib/utils";

const SPORT_SRC: Record<SchoolSport, string> = {
  RUGBY: "/icons/score-sport/rugby.png",
  SOCCER: "/icons/score-sport/soccer.png",
  HOCKEY: "/icons/score-sport/hockey.png",
  NETBALL: "/icons/score-sport/netball.png",
};

function sportIconSrc(sport: string): string {
  return (SPORT_SRC as Record<string, string | undefined>)[sport] ?? SPORT_SRC.RUGBY;
}

/** Tiny sport crest + optional hockey gender icon, bottom-left of a score card. */
export function ScoreCardSportIcons({
  sport,
  teamGender,
  className,
}: {
  sport: SchoolSport | string;
  teamGender: TeamGender | string | null | undefined;
  /** e.g. `bottom-3 left-3` when parent padding differs */
  className?: string;
}) {
  const src = sportIconSrc(sport);
  const isHockey = sport === "HOCKEY";
  const g = teamGender === "MALE" || teamGender === "FEMALE" ? teamGender : null;

  return (
    <div
      className={cn("pointer-events-none absolute bottom-2 left-2 z-[4] flex items-end gap-0.5", className)}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={18}
        height={18}
        className="h-[18px] w-[18px] object-contain drop-shadow"
      />
      {isHockey && g ? (
        <Image
          src={g === "MALE" ? "/icons/score-sport/male.png" : "/icons/score-sport/female.png"}
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain drop-shadow"
        />
      ) : null}
    </div>
  );
}
