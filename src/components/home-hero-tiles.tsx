import Image from "next/image";
import Link from "next/link";

const tileClass =
  "block min-h-0 min-w-0 w-full p-0 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

const frameClass =
  "flex h-[101px] w-full min-h-0 min-w-0 items-center justify-center px-1 sm:h-[120px] sm:px-1.5 md:h-[142px] md:px-2";

const imgClass = "max-h-full max-w-full object-contain";

export function HomeHeroTiles() {
  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-2 items-center justify-items-stretch gap-2 sm:grid-cols-4 sm:gap-3 md:gap-4">
      <Link href="/live" className={tileClass}>
        <div className={frameClass}>
          <Image
            src="/brand/contribute_to_live_scoring.png"
            alt="Contribute to live scoring — open live games"
            width={800}
            height={500}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
      <Link href="/submit" className={tileClass}>
        <div className={frameClass}>
          <Image
            src="/brand/submit_a_score.png"
            alt="Submit a previous score"
            width={733}
            height={654}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
      <Link href="/verified" className={tileClass}>
        <div className={frameClass}>
          <Image
            src="/brand/verified_scores.png"
            alt="Verified scores — browse trusted results by province"
            width={410}
            height={395}
            className={imgClass}
            sizes="(max-width: 640px) 50vw, 25vw"
            priority
          />
        </div>
      </Link>
      <Link href="/find-school" className={tileClass}>
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
