import Image from "next/image";
import Link from "next/link";
import {
  contributeToLiveScoringTileImage,
  submitPreviousScoreTileImage,
  type SchoolSport,
} from "@/lib/sports";

const tileClass =
  "block min-h-0 min-w-0 w-full p-0 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

const frameClass =
  "flex h-[101px] w-full min-h-0 min-w-0 items-center justify-center px-1 sm:h-[120px] sm:px-1.5 md:h-[142px] md:px-2";

const imgClass = "max-h-full max-w-full object-contain";

function withSport(base: string, sport: SchoolSport) {
  const u = new URLSearchParams();
  u.set("sport", sport);
  return `${base}?${u.toString()}`;
}

export function SportHubActionTiles({ sport }: { sport: SchoolSport }) {
  const liveTile = contributeToLiveScoringTileImage(sport);
  const submitTile = submitPreviousScoreTileImage(sport);

  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-2 items-center justify-items-stretch gap-2 sm:grid-cols-4 sm:gap-3 md:gap-4">
      <Link href={withSport("/live", sport)} className={tileClass}>
        <div className={frameClass}>
          <Image
            src={liveTile.src}
            alt="Contribute to live scoring — open live games"
            width={liveTile.width}
            height={liveTile.height}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
      <Link href={withSport("/submit", sport)} className={tileClass}>
        <div className={frameClass}>
          <Image
            src={submitTile.src}
            alt="Submit a previous score"
            width={submitTile.width}
            height={submitTile.height}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
      <Link href={withSport("/results", sport)} className={tileClass}>
        <div className={frameClass}>
          <Image
            src="/brand/verified_scores.png"
            alt="Verified scores — browse trusted results"
            width={410}
            height={395}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
      <Link href={withSport("/find-school", sport)} className={tileClass}>
        <div className={frameClass}>
          <Image
            src="/brand/search_your_school.png"
            alt="Search your school"
            width={800}
            height={500}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
    </section>
  );
}
