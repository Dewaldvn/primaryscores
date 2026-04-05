import { LinkButton } from "@/components/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitScoreForm } from "@/components/submit-score-form";
import { getSessionUser } from "@/lib/auth";
import { listSeasons, listCompetitions } from "@/lib/data/reference";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function SubmitPage() {
  const user = await getSessionUser();

  let seasons: Awaited<ReturnType<typeof listSeasons>> = [];
  let competitions: Awaited<ReturnType<typeof listCompetitions>> = [];
  let provinces: Awaited<ReturnType<typeof listProvinces>> = [];

  if (isDatabaseConfigured()) {
    try {
      ;[seasons, competitions, provinces] = await Promise.all([
        listSeasons(),
        listCompetitions(),
        listProvinces(),
      ]);
    } catch {
      /* empty */
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Submit a score</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Share a U13 primary school result with supporting detail. Your entry is saved to the database as
          soon as you submit and stays <strong className="font-medium">pending</strong> until a moderator
          verifies it. Please be accurate — wrong information slows everyone down.
        </p>
      </div>

      {!user ? (
        <Card>
          <CardContent className="space-y-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in with email to submit scores and track your submissions.
            </p>
            <div className="flex justify-center gap-2">
              <LinkButton href="/login?redirect=/submit">Sign in</LinkButton>
              <LinkButton href="/signup" variant="outline">
                Create account
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      ) : (
        <SubmitScoreForm
          seasons={seasons}
          competitions={competitions}
          provinces={provinces}
        />
      )}
    </div>
  );
}
