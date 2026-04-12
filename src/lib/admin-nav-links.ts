/** Full admin toolbar (same entries as `/admin` layout). */

export type AdminNavLink = { readonly href: string; readonly label: string };

export const ADMIN_NAV_LINKS: readonly AdminNavLink[] = [
  { href: "/moderator", label: "Moderation" },
  { href: "/admin/scores", label: "Scores" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/seasons", label: "Seasons & competitions" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/merge", label: "Merge (placeholder)" },
  { href: "/api/admin/export/schools", label: "Export schools CSV" },
];
