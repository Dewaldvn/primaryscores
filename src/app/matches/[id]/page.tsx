import Link from "next/link";
import { notFound } from "next/navigation";
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {row.competitionName} · {row.seasonName} ({row.seasonYear})
          </p>
          <h1 className="text-2xl font-bold">
            <Link href={`/schools/${row.homeSchoolSlug}`} className="hover:underline">
              {row.homeSchoolName}
            </Link>
            <span className="text-muted-foreground"> vs </span>
            <Link href={`/schools/${row.awaySchoolSlug}`} className="hover:underline">
              {row.awaySchoolName}
            </Link>
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
        <CardHeader>
          <CardTitle className="text-lg">Final score</CardTitle>
        </CardHeader>
        <CardContent>
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
