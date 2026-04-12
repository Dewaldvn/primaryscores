import { requireRole } from "@/lib/auth";
import Link from "next/link";

const adminNavLinks = [
  { href: "/moderator", label: "Moderation" },
  { href: "/admin/scores", label: "Scores" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/seasons", label: "Seasons & competitions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/merge", label: "Merge (placeholder)" },
  { href: "/api/admin/export/schools", label: "Export schools CSV" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);
  return (
    <div className="space-y-6">
      <nav
        className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b pb-3 text-sm"
        aria-label="Admin sections"
      >
        {adminNavLinks.map((item, i) => (
          <span key={item.href} className="inline-flex items-center gap-x-2">
            {i > 0 ? (
              <span className="select-none text-muted-foreground" aria-hidden="true">
                |
              </span>
            ) : null}
            <Link href={item.href} className="font-medium text-primary hover:underline">
              {item.label}
            </Link>
          </span>
        ))}
      </nav>
      {children}
    </div>
  );
}
