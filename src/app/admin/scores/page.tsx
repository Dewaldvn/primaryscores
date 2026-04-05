import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminScoresTable } from "@/components/admin-scores-table";
import { adminListAllResults } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default async function AdminScoresPage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const q = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const search = q("q") ?? "";
  const page = Math.max(1, Number(q("page")) || 1);
  const pageSize = 25;

  const { rows, total, page: p, pageSize: ps } = await adminListAllResults({
    page,
    pageSize,
    search: search.trim() || undefined,
  });

  const serialized = rows.map((r) => ({
    resultId: r.resultId,
    fixtureId: r.fixtureId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    verificationLevel: r.verificationLevel as
      | "SUBMITTED"
      | "MODERATOR_VERIFIED"
      | "SOURCE_VERIFIED",
    isVerified: r.isVerified,
    publishedAt: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : null,
    matchDate: r.matchDate,
    venue: r.venue,
    homeSchoolName: r.homeSchoolName,
    awaySchoolName: r.awaySchoolName,
    homeSchoolLogoPath: r.homeSchoolLogoPath,
    awaySchoolLogoPath: r.awaySchoolLogoPath,
    competitionName: r.competitionName,
    seasonName: r.seasonName,
    provinceName: r.provinceName,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scores & results</h1>
        <p className="text-sm text-muted-foreground">
          Every stored result (verified or not). Edit scores, date, venue, and whether a result is public.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All results</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminScoresTable
            rows={serialized}
            total={total}
            page={p}
            pageSize={ps}
            initialSearch={search}
          />
        </CardContent>
      </Card>
    </div>
  );
}
