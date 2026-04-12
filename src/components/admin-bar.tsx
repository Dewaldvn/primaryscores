import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav-links";

/** Site-wide admin toolbar for ADMIN users, shown above favourite schools. */
export async function AdminBar() {
  if (!isDatabaseConfigured()) return null;
  const profile = await getProfile();
  if (!profile || profile.role !== "ADMIN") return null;

  return (
    <nav
      className="rounded-xl border border-green-200/90 bg-green-50 px-4 py-2.5 text-sm shadow-sm dark:border-green-900/50 dark:bg-green-950/40"
      aria-label="Admin sections"
    >
      <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
        <span className="pr-1 font-bold text-foreground">Admin</span>
        {ADMIN_NAV_LINKS.map((item) => (
          <span key={item.href} className="inline-flex items-center">
            <span className="select-none px-1.5 text-green-300/80 dark:text-green-800/60" aria-hidden="true">
              |
            </span>
            <Link
              href={item.href}
              className="px-0.5 font-medium text-green-900 underline-offset-2 hover:underline dark:text-green-100 dark:hover:text-white"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </div>
    </nav>
  );
}
