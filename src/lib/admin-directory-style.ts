import { cn } from "@/lib/utils";

/**
 * Alternating brand-green (primary) row backgrounds for admin school/team directory tables
 * and lists. Tied to `globals.css` --primary; hover emphasis for click targets.
 */
export function adminDirectoryZebraTableRowClass(index: number) {
  const even = index % 2 === 0;
  return cn(
    "border-border",
    even
      ? "bg-primary/[0.1] dark:bg-primary/10"
      : "bg-primary/[0.2] dark:bg-primary/20",
    "hover:!bg-primary/[0.32] dark:hover:!bg-primary/35",
  );
}

export function adminDirectoryZebraListRowClass(index: number) {
  return cn(adminDirectoryZebraTableRowClass(index), "rounded-sm");
}
