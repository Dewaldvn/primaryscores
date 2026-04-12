import Link from "next/link";
import { getProfile } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { SCHOOL_ADMIN_NAV_LINKS } from "@/lib/school-admin-nav-links";

/** Site-wide toolbar for School Admin users with at least one active school link. */
export async function SchoolAdminBar() {
  if (!isDatabaseConfigured()) return null;
  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") return null;

  const managed = await getActiveManagedSchoolIds(profile.id);
  if (managed.length === 0) return null;

  return (
    <nav
      className="rounded-xl border border-sky-200/90 bg-sky-50 px-4 py-2.5 text-sm shadow-sm dark:border-sky-900/50 dark:bg-sky-950/40"
      aria-label="School admin sections"
    >
      <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
        <span className="pr-1 font-bold text-foreground">School admin</span>
        {SCHOOL_ADMIN_NAV_LINKS.map((item) => (
          <span key={item.href} className="inline-flex items-center">
            <span
              className="select-none px-1.5 text-sky-300/80 dark:text-sky-800/60"
              aria-hidden="true"
            >
              |
            </span>
            <Link
              href={item.href}
              className="px-0.5 font-medium text-sky-950 underline-offset-2 hover:underline dark:text-sky-100 dark:hover:text-white"
            >
              {item.label}
            </Link>
          </span>
        ))}
      </div>
    </nav>
  );
}
