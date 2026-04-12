import { requireRole } from "@/lib/auth";

export default async function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["SCHOOL_ADMIN"]);
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">{children}</div>;
}
