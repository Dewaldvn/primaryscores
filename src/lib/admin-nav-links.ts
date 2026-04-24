/** Full admin toolbar (same entries as `/admin` layout). */

export type AdminNavLink = { readonly href: string; readonly label: string };

export const ADMIN_NAV_LINKS: readonly AdminNavLink[] = [
  { href: "/admin/scores", label: "Scores" },
  { href: "/moderator", label: "Moderation" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/school-admins", label: "School Admin" },
  { href: "/admin/schedule-live", label: "Schedule a match" },
  { href: "/admin/seasons", label: "Seasons and Competitions" },
  { href: "/admin/merge", label: "Merge schools" },
  { href: "/admin/import-export", label: "Import/Export" },
];
