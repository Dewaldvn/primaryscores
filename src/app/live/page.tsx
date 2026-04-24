import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { GamesUnderway } from "@/components/games-underway";
import { UpcomingScheduledSection } from "@/components/upcoming-scheduled-section";
import { adminListCompetitions, adminListSeasons } from "@/lib/data/admin";
import { listScheduledLiveSessions } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { parseSportQueryParam, schoolSportLabel, type SchoolSport } from "@/lib/sports";

export const metadata = {
  title: "Live scoring",
  description: "Start or join live primary school score sessions (rugby, netball, hockey, soccer).",
};

type Props = { searchParams: Record<string, string | string[] | undefined> };

function qp(searchParams: Props["searchParams"], key: string): string | undefined {
  const v = searchParams[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function LiveHubPage({ searchParams }: Props) {
  const signedIn = isDatabaseConfigured() ? Boolean(await getSessionUser()) : false;
  const sportFilter = parseSportQueryParam(qp(searchParams, "sport"));
  const scheduledSessions = isDatabaseConfigured()
    ? await listScheduledLiveSessions({ limit: 40, sport: sportFilter })
    : [];
  const liveMeta = isDatabaseConfigured()
    ? await Promise.all([adminListSeasons(), adminListCompetitions()])
    : null;
  const liveSeasonOptions = liveMeta
    ? liveMeta[0].map((r) => ({
        id: r.season.id,
        sport: r.season.sport as SchoolSport,
        label: `${r.season.name} (${r.season.year})${r.provinceName ? ` · ${r.provinceName}` : ""}`,
      }))
    : [];
  const liveCompetitionOptions = liveMeta
    ? liveMeta[1].map((r) => ({
        id: r.competition.id,
        sport: r.competition.sport as SchoolSport,
        label: `${r.competition.name}${r.competition.year ? ` (${r.competition.year})` : ""}${
          r.provinceName ? ` · ${r.provinceName}` : ""
        }`,
      }))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live scoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {sportFilter ? (
            <>
              Showing <span className="font-medium text-foreground">{schoolSportLabel(sportFilter)}</span> sessions.
              Open the{" "}
              <Link href="/live" className="text-primary underline-offset-4 hover:underline">
                all-sports hub
              </Link>{" "}
              to see every live game.
            </>
          ) : (
            "Start a new game or open a session below to contribute scores in real time."
          )}
        </p>
      </div>
      {isDatabaseConfigured() ? (
        <>
          <UpcomingScheduledSection sessions={scheduledSessions} variant="live" />
          <GamesUnderway
            signedIn={signedIn}
            startImageAbove
            sportFilter={sportFilter}
            seasonOptions={liveSeasonOptions}
            competitionOptions={liveCompetitionOptions}
          />
        </>
      ) : null}
    </div>
  );
}
