import Link from "next/link";
import { getProfile } from "@/lib/auth";

export type AdminShortcutLink = {
  href: string;
  label: string;
};

/**
 * On public browse pages, shows quick links to the relevant admin tools (ADMIN role only).
 */
export async function AdminPublicShortcuts({ links }: { links: AdminShortcutLink[] }) {
  const profile = await getProfile();
  if (profile?.role !== "ADMIN" || links.length === 0) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
      <span className="font-medium text-foreground">Admin</span>
      {links.map((l) => (
        <Link
          key={`${l.href}-${l.label}`}
          href={l.href}
          className="text-primary underline-offset-4 hover:underline"
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
