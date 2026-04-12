import { getSessionUser } from "@/lib/auth";
import { GamesUnderway } from "@/components/games-underway";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const metadata = {
  title: "Live scoring",
  description: "Start or join live primary school rugby score sessions.",
};

export default async function LiveHubPage() {
  const signedIn = isDatabaseConfigured() ? Boolean(await getSessionUser()) : false;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live scoring</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a new game or open a session below to contribute scores in real time.
        </p>
      </div>
      {isDatabaseConfigured() ? <GamesUnderway signedIn={signedIn} startImageAbove /> : null}
    </div>
  );
}
