import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCompetitions } from "@/lib/data/reference";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";

export default async function CompetitionsPage() {
  let comps: Awaited<ReturnType<typeof listCompetitions>> = [];
  if (isDatabaseConfigured()) {
    try {
      comps = await withTimeout(listCompetitions(), PUBLIC_DB_QUERY_MS);
    } catch {
      /* empty */
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Competitions</h1>
        <p className="text-sm text-muted-foreground">
          Provincial and inter-school competitions on record.
        </p>
      </div>
      {comps.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No competitions yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {comps.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link href={`/competitions/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {c.provinceName ?? "National / multi-province"}
                {c.level ? ` · ${c.level}` : ""}
                {c.organiser ? ` · ${c.organiser}` : ""}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
