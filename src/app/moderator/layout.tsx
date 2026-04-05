import { requireRole } from "@/lib/auth";

export default async function ModeratorLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["MODERATOR", "ADMIN"]);
  return <div className="space-y-6">{children}</div>;
}
