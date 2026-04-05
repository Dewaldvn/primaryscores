import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { getCompetition } from "@/lib/data/reference";
import { listVerifiedResults } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = { params: { id: string } };

export default async function CompetitionDetailPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();
  const comp = await getCompetition(params.id);
  if (!comp) notFound();

  const { rows } = await listVerifiedResults({ competitionId: params.id, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{comp.name}</h1>
        <p className="text-sm text-muted-foreground">
          {comp.provinceName ?? "Various provinces"}
          {comp.level ? ` · ${comp.level}` : ""}
        </p>
      </div>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No verified results linked to this competition.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.resultId}>
              <Card>
                <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <Link href={`/schools/${r.homeSchoolSlug}`} className="font-medium hover:underline">
                      {r.homeSchoolName}
                    </Link>
                    <span className="text-muted-foreground"> vs </span>
                    <Link href={`/schools/${r.awaySchoolSlug}`} className="font-medium hover:underline">
                      {r.awaySchoolName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {r.seasonName} ·{" "}
                      {r.matchDate
                        ? format(new Date(r.matchDate + "T12:00:00"), "d MMM yyyy")
                        : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-semibold">
                      {r.homeScore} – {r.awayScore}
                    </span>
                    <VerificationBadge level={r.verificationLevel} compact />
                    <Link href={`/matches/${r.fixtureId}`} className="text-sm text-primary hover:underline">
                      Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
