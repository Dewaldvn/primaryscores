"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SCHOOL_SPORTS, schoolSportLabel, sportToRouteSlug } from "@/lib/sports";

const contentClass = cn(
  "z-[250] min-w-[10rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
);

const itemClass = cn(
  "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none",
  "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
);

export function SiteHeaderSportsMenu() {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-haspopup="menu"
          aria-label="Sports menu"
        >
          Sports
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={contentClass}
          sideOffset={6}
          align="start"
          collisionPadding={12}
        >
          {SCHOOL_SPORTS.map((sport) => (
            <DropdownMenu.Item key={sport} asChild>
              <Link href={`/sport/${sportToRouteSlug(sport)}`} className={itemClass}>
                {schoolSportLabel(sport)}
              </Link>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
