import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { ModerationStatusBadge } from "@/components/verification-badge";
import { LinkButton } from "@/components/link-button";
import { requireUser } from "@/lib/auth";
import { getSubmissionsForUser } from "@/lib/data/submissions";

export default async function MySubmissionsPage() {
  const user = await requireUser();
  const rows = await getSubmissionsForUser(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My submissions</h1>
          <p className="text-sm text-muted-foreground">
            Track pending moderator decisions on scores you&apos;ve contributed.
          </p>
        </div>
        <LinkButton href="/submit">New submission</LinkButton>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            You haven&apos;t submitted anything yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium">
                      {s.proposedHomeTeamName} vs {s.proposedAwayTeamName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {s.proposedHomeScore}–{s.proposedAwayScore} ·{" "}
                      {s.proposedMatchDate
                        ? format(new Date(s.proposedMatchDate + "T12:00:00"), "d MMM yyyy")
                        : ""}{" "}
                      · submitted {format(new Date(s.submittedAt), "d MMM yyyy")}
                    </div>
                  </div>
                  <ModerationStatusBadge status={s.moderationStatus} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
