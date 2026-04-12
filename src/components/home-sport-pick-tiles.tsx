import Image from "next/image";
import Link from "next/link";
import { SCHOOL_SPORTS, schoolSportLabel, sportToRouteSlug, type SchoolSport } from "@/lib/sports";

const tileClass =
  "block min-h-0 min-w-0 w-full rounded-lg p-0 ring-offset-background transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const frameClass =
  "flex aspect-[4/5] w-full min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-lg border bg-card px-2 py-3 shadow-sm sm:aspect-[5/6]";

/** 80% of frame = 20% smaller than filling the tile */
const imgClass = "max-h-[80%] max-w-[80%] object-contain";

const HUB_IMAGE: Record<SchoolSport, string> = {
  RUGBY: "/brand/sport-rugby.png",
  NETBALL: "/brand/sport-netball.png",
  HOCKEY: "/brand/sport-hockey.png",
  SOCCER: "/brand/sport-soccer.png",
};

export function HomeSportPickTiles() {
  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-2 items-stretch justify-items-stretch gap-3 sm:grid-cols-4 sm:gap-4">
      {SCHOOL_SPORTS.map((s) => (
        <Link
          key={s}
          href={`/sport/${sportToRouteSlug(s)}`}
          className={tileClass}
          aria-label={`${schoolSportLabel(s)} — open hub`}
        >
          <div className={frameClass}>
            <Image
              src={HUB_IMAGE[s]}
              alt=""
              width={400}
              height={500}
              className={imgClass}
              sizes="(max-width: 640px) 50vw, 25vw"
              priority
            />
          </div>
        </Link>
      ))}
    </section>
  );
}
