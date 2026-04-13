import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Schools Scores SA is for, and how live scores, results, submissions, schools, and school admin tools work together.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">About Schools Scores SA</h1>
        <p className="text-lg text-muted-foreground">
          A public home for <strong>school sports results</strong> in South Africa — with trusted archives,
          community contributions, and optional <strong>live crowd scoreboards</strong> during matches.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What this site is for</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Schools Scores SA helps families, schools, and fans <strong>find and share match results</strong> across
            sports like rugby, netball, hockey, and soccer. Verified results build a lasting record; live scoring adds a
            simple way to follow a game as it happens, then funnel those numbers into the same moderation pipeline as
            other submissions.
          </p>
          <p>
            The site does not replace official league systems — it <strong>aggregates and verifies</strong> what the
            community submits so scores are easier to discover in one place.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results archive</CardTitle>
          <CardDescription>Verified history you can browse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            The <Link href="/results" className="font-medium text-primary hover:underline">Results</Link> area lists
            published, <strong>moderator- or source-verified</strong> fixtures. You can filter by sport and use search
            from the header to find schools, teams, or competitions.
          </p>
          <p>
            School profile pages show recent activity for that school and (where we have data) active teams you can
            favourite for quick access on your home page.
          </p>
          <div className="pt-1">
            <LinkButton href="/results" variant="outline" size="sm">
              Open results
            </LinkButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live scores</CardTitle>
          <CardDescription>Crowd-sourced boards during a match</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <Link href="/live" className="font-medium text-primary hover:underline">Live Scores</Link> lists games with
            an open board. Anyone signed in can cast score “votes”; the board shows the running majority. Boards can
            be started ad hoc or <strong>scheduled</strong> by a linked school admin to open at a specific date and
            time.
          </p>
          <p>
            When a board <strong>opens for scoring</strong>, a timer starts (not from the first vote). After a set
            period the board moves into <strong>wrap-up</strong>: you confirm the final numbers and submit for
            moderator review. If nothing is submitted in time, the system can <strong>auto-create a draft submission</strong>{" "}
            so the match is not left hanging.
          </p>
          <p className="text-xs">
            Scheduled boards stay closed until their start time; the same wrap-up rules apply from that moment.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <LinkButton href="/live" variant="outline" size="sm">
              Live hub
            </LinkButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit a score</CardTitle>
          <CardDescription>Contributors and moderation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Signed-in users can use <Link href="/submit" className="font-medium text-primary hover:underline">Submit</Link>{" "}
            to propose a result (sport-specific form). Submissions may include optional evidence (e.g. a photo). A{" "}
            <strong>spam check</strong> runs in the background; moderators then <strong>approve, reject, or flag</strong>{" "}
            entries so only appropriate rows reach the public archive.
          </p>
          <p>
            Live boards that are submitted for review appear in the same queue, tied back to the live session where
            applicable.
          </p>
          <div className="pt-1">
            <LinkButton href="/submit" variant="outline" size="sm">
              Submit a score
            </LinkButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools & teams</CardTitle>
          <CardDescription>Directory and growth of the database</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            <Link href="/find-school" className="font-medium text-primary hover:underline">Schools</Link> helps you
            browse by province and jump to a school&apos;s public page (crest, teams, recent verified results).
          </p>
          <p>
            If a school or team is missing, signed-in users can use{" "}
            <Link href="/add-team" className="font-medium text-primary hover:underline">Add a school or team</Link> so
            moderators can review new metadata before it is used in fixtures.
          </p>
          <p>
            <strong>My favourites</strong> (account menu) stores schools and teams you care about for quicker access
            from the home page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>School administrators</CardTitle>
          <CardDescription>Linked schools only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Users with the <strong>School admin</strong> role — after linking and approval — can update their
            school&apos;s profile and logo, maintain teams, work with published scores for their schools, schedule live
            boards, export CSV data, and invite other registered users to a team where that feature is enabled.
          </p>
          <p>
            Applying to represent a school uses the{" "}
            <Link href="/apply-school-admin" className="font-medium text-primary hover:underline">
              school admin application
            </Link>{" "}
            flow (including moderator review).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accounts & trust</CardTitle>
          <CardDescription>Why sign in</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Browsing verified results is public. <strong>Signing in</strong> unlocks submissions, live voting, favourites,
            school admin tools (when assigned), and a personal <strong>Account</strong> area for your profile.
          </p>
          <p>
            <strong>Moderators</strong> and <strong>site admins</strong> have extra menus to review submissions, manage
            users and metadata, and keep the archive consistent.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>⌘K / header search</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <p>
            The header search finds schools, teams, and results across the site (including nicknames where stored).
            On small screens, open the menu and tap the search icon if the full nav is collapsed.
          </p>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="text-primary hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
