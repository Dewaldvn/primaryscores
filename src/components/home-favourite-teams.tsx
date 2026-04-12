import Link from "next/link";
import { SchoolLogo } from "@/components/school-logo";
import { LinkButton } from "@/components/link-button";
import type { FavouriteTeamRow } from "@/lib/data/favourite-teams";
import { formatTeamListingSubtitle } from "@/lib/format-team";

export function HomeFavouriteTeamsPeek({ rows }: { rows: FavouriteTeamRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border bg-muted/15 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Favourite teams</h2>
        <LinkButton href="/my-favourites#teams" variant="outline" size="sm">
          Manage
        </LinkButton>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Teams you saved from a school page — jump back to results and fixtures.
      </p>
      <ul className="mt-2 divide-y rounded-md border bg-background/80 text-sm">
        {rows.map((r) => (
          <li key={r.teamId}>
            <Link
              href={`/schools/${r.schoolSlug}#teams`}
              className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-3 py-2 hover:bg-muted/60"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <SchoolLogo logoPath={r.schoolLogoPath} alt="" size="xs" className="shrink-0" />
                <span className="min-w-0">
                  <span className="font-medium">{r.schoolName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatTeamListingSubtitle({
                      sport: r.sport,
                      ageGroup: r.ageGroup,
                      teamLabel: r.teamLabel,
                      gender: r.gender,
                    })}
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
