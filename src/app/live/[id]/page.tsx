import { notFound } from "next/navigation";
import { LiveSessionDetailClient } from "@/components/live-session-detail-client";
import { getProfile, getSessionUser } from "@/lib/auth";
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
  const profile = isDatabaseConfigured() ? await getProfile() : null;
  const isAdmin = profile?.role === "ADMIN";

  return (
    <main className="container max-w-5xl px-4 py-6 sm:py-8">
      <LiveSessionDetailClient sessionId={id} signedIn={Boolean(sessionUser)} isAdmin={isAdmin} />
    </main>
  );
}
