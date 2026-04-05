import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPublicShortcuts } from "@/components/admin-public-shortcuts";
import { SchoolLogo } from "@/components/school-logo";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { getMatchDetails } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = { params: { id: string } };

export default async function MatchPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();

  const row = await getMatchDetails(params.id);
  if (!row?.resultId || !row.isVerified || !row.publishedAt) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPublicShortcuts
        links={[
          { href: "/admin/scores", label: "Manage scores" },
          { href: "/admin/seasons", label: "Seasons & competitions" },
        ]}
      />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {[row.competitionName, row.seasonName, row.seasonYear != null ? `(${row.seasonYear})` : null]
              .filter((x) => x != null && String(x).length > 0)
              .join(" · ") || "Season / competition not set"}
          </p>
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-2 text-2xl font-bold">
            <span className="inline-flex items-center gap-3">
              <SchoolLogo logoPath={row.homeSchoolLogoPath} alt="" size="lg" />
              <Link href={`/schools/${row.homeSchoolSlug}`} className="hover:underline">
                {row.homeSchoolName}
              </Link>
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="inline-flex items-center gap-3">
              <SchoolLogo logoPath={row.awaySchoolLogoPath} alt="" size="lg" />
              <Link href={`/schools/${row.awaySchoolSlug}`} className="hover:underline">
                {row.awaySchoolName}
              </Link>
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.matchDate
              ? format(new Date(row.matchDate + "T12:00:00"), "EEEE d MMMM yyyy")
              : ""}
            {row.venue ? ` · ${row.venue}` : ""}
          </p>
        </div>
        <VerificationBadge level={row.verificationLevel ?? "SUBMITTED"} />
      </div>

      <Card>
        <CardHeader className="justify-items-center text-center">
          <CardTitle className="text-lg">Final score</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="font-mono text-4xl font-bold tabular-nums">
            {row.homeScore} – {row.awayScore}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {row.homeTeamLabel} vs {row.awayTeamLabel}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
