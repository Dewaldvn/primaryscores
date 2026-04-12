import Link from "next/link";
import { format } from "date-fns";
import { SchoolLogo } from "@/components/school-logo";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { listVerifiedResults } from "@/lib/data/results";
import { listProvinces } from "@/lib/data/schools";
import { adminListSchools } from "@/lib/data/admin";
import { listSeasons, listCompetitions } from "@/lib/data/reference";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { ResultsFilterForm } from "@/components/results-filter-form";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";

type Props = { searchParams: Record<string, string | string[] | undefined> };

function resultsHref(
  f: {
    provinceId?: string;
    schoolId?: string;
    seasonId?: string;
    competitionId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  },
  pageNum: number
) {
  const q = new URLSearchParams();
  if (f.provinceId) q.set("province", f.provinceId);
  if (f.schoolId) q.set("school", f.schoolId);
  if (f.seasonId) q.set("season", f.seasonId);
  if (f.competitionId) q.set("competition", f.competitionId);
  if (f.dateFrom) q.set("from", f.dateFrom);
  if (f.dateTo) q.set("to", f.dateTo);
  if (f.search) q.set("search", f.search);
  q.set("page", String(pageNum));
  return `/results?${q.toString()}`;
}

export default async function ResultsPage({ searchParams }: Props) {
  const sp = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const filters = {
    provinceId: sp("province"),
    schoolId: sp("school"),
    seasonId: sp("season"),
    competitionId: sp("competition"),
    dateFrom: sp("from"),
    dateTo: sp("to"),
    search: sp("search"),
    page: sp("page") ? Number(sp("page")) : 1,
  };

  let rows: Awaited<ReturnType<typeof listVerifiedResults>>["rows"] = [];
  let total = 0;
  let page = 1;
  let pageSize = 15;

  let provinces: Awaited<ReturnType<typeof listProvinces>> = [];
  let schoolOptions: { id: string; label: string }[] = [];
  let seasons: Awaited<ReturnType<typeof listSeasons>> = [];
  let comps: Awaited<ReturnType<typeof listCompetitions>> = [];

  if (isDatabaseConfigured()) {
    try {
      await withTimeout(
        (async () => {
          const list = await adminListSchools();
          schoolOptions = list.map((s) => ({
            id: s.school.id,
            label: s.school.displayName,
          }));
          ;[provinces, seasons, comps] = await Promise.all([
            listProvinces(),
            listSeasons(),
            listCompetitions(),
          ]);
          const res = await listVerifiedResults(filters);
          rows = res.rows;
          total = res.total;
          page = res.page;
          pageSize = res.pageSize;
        })(),
        PUBLIC_DB_QUERY_MS
      );
    } catch {
      /* empty */
    }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Results archive</h1>
        <p className="text-sm text-muted-foreground">
          Verified U13 scores. Filters use case-insensitive partial matching for search.
        </p>
      </div>

      <ResultsFilterForm
        provinces={provinces}
        schools={schoolOptions}
        seasons={seasons}
        competitions={comps.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          provinceId: filters.provinceId,
          schoolId: filters.schoolId,
          seasonId: filters.seasonId,
          competitionId: filters.competitionId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          search: filters.search,
        }}
      />

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No results match these filters, or the database is empty. Try clearing filters or seeding demo
            data.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.resultId}>
              <Card className="relative transition-colors hover:bg-muted/30">
                <Link
                  href={`/matches/${r.fixtureId}`}
                  className="absolute inset-0 z-[1] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Match details: ${r.homeSchoolName} versus ${r.awaySchoolName}`}
                >
                  <span className="sr-only">
                    View match details: {r.homeSchoolName} versus {r.awaySchoolName}
                  </span>
                </Link>
                <CardContent className="relative z-[2] pointer-events-none flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size="md" />
                        <Link
                          href={`/schools/${r.homeSchoolSlug}`}
                          className="pointer-events-auto hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {r.homeSchoolName}
                        </Link>
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size="md" />
                        <Link
                          href={`/schools/${r.awaySchoolSlug}`}
                          className="pointer-events-auto hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {r.awaySchoolName}
                        </Link>
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[r.competitionName, r.seasonName].filter(Boolean).join(" · ") || "—"}
                      {r.provinceName ? ` · ${r.provinceName}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.matchDate
                        ? format(new Date(r.matchDate + "T12:00:00"), "d MMM yyyy")
                        : ""}
                    </div>
                    {r.recordingUrl ? (
                      <SuperSportsRecordingLink
                        href={r.recordingUrl}
                        className="pointer-events-auto pt-0.5 text-xs"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xl font-semibold tabular-nums">
                      {r.homeScore} – {r.awayScore}
                    </span>
                    <VerificationBadge level={r.verificationLevel} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <LinkButton href={resultsHref(filters, page - 1)} variant="outline" size="sm">
              Previous
            </LinkButton>
          )}
          <span className="self-center text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <LinkButton href={resultsHref(filters, page + 1)} variant="outline" size="sm">
              Next
            </LinkButton>
          )}
        </div>
      )}
    </div>
  );
}
