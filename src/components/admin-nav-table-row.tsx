"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type NavTableRowProps = React.ComponentProps<typeof TableRow> & {
  href: string;
};

/** Table row that navigates to `href` when clicked. Use e.stopPropagation() on nested links and buttons. */
export function AdminNavTableRow({ href, className, onClick, children, ...props }: NavTableRowProps) {
  const router = useRouter();
  return (
    <TableRow
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        router.push(href);
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
}

type NavListRowProps = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/** Roster / list row that navigates to `href` (when teams are not shown in a &lt;table&gt;). */
export function AdminNavListRow({ href, className, children }: NavListRowProps) {
  const router = useRouter();
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 px-1 py-0.5 transition-colors",
        className,
      )}
      onClick={() => router.push(href)}
    >
      {children}
    </li>
  );
}

/** `next/link` with stopPropagation for use inside `AdminNavTableRow` (Server Components cannot pass onClick to Link). */
export function AdminRowNavLink(props: Omit<ComponentProps<typeof Link>, "onClick">) {
  return <Link {...props} onClick={(e) => e.stopPropagation()} />;
}

/** `LinkButton` with stopPropagation for use inside `AdminNavTableRow` / `AdminNavListRow`. */
export function AdminRowLinkButton(props: ComponentProps<typeof LinkButton>) {
  return <LinkButton {...props} onClick={(e) => e.stopPropagation()} />;
}
