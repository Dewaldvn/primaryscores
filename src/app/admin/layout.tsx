import { requireRole } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b pb-3 text-sm">
        <Link href="/admin/scores" className="font-medium text-primary hover:underline">
          Scores
        </Link>
        <Link href="/admin/schools" className="text-primary hover:underline">
          Schools
        </Link>
        <Link href="/admin/teams" className="text-primary hover:underline">
          Teams
        </Link>
        <Link href="/admin/seasons" className="text-primary hover:underline">
          Seasons & competitions
        </Link>
        <Link href="/admin/users" className="text-primary hover:underline">
          Users
        </Link>
        <Link href="/admin/merge" className="text-primary hover:underline">
          Merge (placeholder)
        </Link>
        <Link href="/api/admin/export/schools" className="text-primary hover:underline">
          Export schools CSV
        </Link>
      </nav>
      {children}
    </div>
  );
}
