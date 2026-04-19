import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/link-button";
import type { HomePageStats } from "@/lib/data/home-stats";

function formatStat(n: number) {
  return n.toLocaleString("en-ZA");
}

export function HomeHeroSection({ stats }: { stats: HomePageStats | null }) {
  return (
    <section className="grid items-center gap-6 py-3 sm:gap-8 sm:py-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)] lg:gap-10 lg:py-6">
      <div className="flex min-w-0 flex-col gap-5 text-center lg:text-left">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:text-[11px] sm:tracking-[0.1em]">
          Schools scores - Rugby - Netball - Hockey - Soccer
        </p>

        <div className="space-y-1">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15]">
            School sport results you can trust.
          </h1>
          <p className="text-balance text-3xl font-bold tracking-tight text-primary sm:text-4xl lg:text-[2.35rem] lg:leading-[1.15]">
            Verified by the crowd.
          </p>
        </div>

        <p className="mx-auto max-w-xl text-pretty text-base leading-relaxed text-muted-foreground lg:mx-0 lg:max-w-none">
          Share a score, vote on a live game, or follow your school. Built for parents, coaches and supporters across
          South Africa.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
          <LinkButton href="/submit" size="lg" className="gap-2 shadow-sm">
            Submit a score
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </LinkButton>
          <LinkButton href="/live" variant="outline" size="lg" className="shadow-sm">
            Open live scoring
          </LinkButton>
        </div>

        <p className="text-sm text-muted-foreground">
          {stats ? (
            <>
              <span className="tabular-nums">{formatStat(stats.verifiedResults)}</span> verified results{" "}
              <span className="select-none px-0.5 text-muted-foreground/50" aria-hidden>
                ·
              </span>{" "}
              <span className="tabular-nums">{formatStat(stats.schools)}</span> schools{" "}
              <span className="select-none px-0.5 text-muted-foreground/50" aria-hidden>
                ·
              </span>{" "}
              <span className="tabular-nums">{stats.sportsCount}</span> sports
            </>
          ) : (
            <>
              <span aria-hidden>—</span> verified results{" "}
              <span className="select-none px-0.5 text-muted-foreground/50" aria-hidden>
                ·
              </span>{" "}
              <span aria-hidden>—</span> schools{" "}
              <span className="select-none px-0.5 text-muted-foreground/50" aria-hidden>
                ·
              </span>{" "}
              4 sports
            </>
          )}
        </p>
      </div>

      <div className="relative mx-auto flex w-full max-w-[min(100%,380px)] justify-center lg:mx-0 lg:max-w-none lg:justify-end">
        <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px]">
          <Image
            src="/brand/verified_scores.png"
            alt=""
            fill
            className="object-contain object-center drop-shadow-sm"
            sizes="(max-width: 1024px) min(380px, 85vw), 380px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
