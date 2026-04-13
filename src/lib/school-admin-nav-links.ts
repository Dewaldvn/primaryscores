/** Site-wide school admin toolbar (same entries as `/school-admin` hub). */

export type SchoolAdminNavLink = { readonly href: string; readonly label: string };

export const SCHOOL_ADMIN_NAV_LINKS: readonly SchoolAdminNavLink[] = [
  { href: "/school-admin", label: "Overview" },
  { href: "/school-admin/schools", label: "School profile" },
  { href: "/school-admin/schedule-live", label: "Schedule live game" },
  { href: "/school-admin/scores", label: "Scores" },
  { href: "/school-admin/teams", label: "Teams" },
  { href: "/school-admin/export", label: "Export" },
  { href: "/school-admin/claim", label: "Link school" },
];
