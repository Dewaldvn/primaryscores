import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSeasons } from "@/lib/data/reference";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";

export default async function SeasonsPage() {
  let seasons: Awaited<ReturnType<typeof listSeasons>> = [];
  if (isDatabaseConfigured()) {
    try {
      seasons = await withTimeout(listSeasons(), PUBLIC_DB_QUERY_MS);
    } catch {
      /* empty */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seasons</h1>
        <p className="text-sm text-muted-foreground">Browse archives by rugby season.</p>
      </div>
      {seasons.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No seasons yet. Seed the database from the README.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {seasons.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link href={`/seasons/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {s.year} · {s.startDate} → {s.endDate}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
