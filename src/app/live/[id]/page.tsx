import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveSessionDetailClient } from "@/components/live-session-detail-client";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db-safe";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = { params: { id: string } };

export default async function LiveGamePage({ params }: Props) {
  const { id } = params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const sessionUser = isDatabaseConfigured() ? await getSessionUser() : null;

  return (
    <main className="container max-w-5xl space-y-6 py-8">
      <div>
        <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          ← Games underway
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Live score</h1>
        <p className="text-sm text-muted-foreground">
          Crowd majority score · refreshes every few seconds. Sign in to add your view.
        </p>
      </div>
      <LiveSessionDetailClient sessionId={id} signedIn={Boolean(sessionUser)} />
    </main>
  );
}
