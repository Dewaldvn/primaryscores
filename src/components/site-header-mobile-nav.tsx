"use client";

import { useState } from "react";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { HeaderProfile } from "@/components/site-header";
import { SCHOOL_SPORTS, schoolSportLabel, sportToRouteSlug } from "@/lib/sports";

const navLinkClass =
  "rounded-md px-3 py-2.5 text-base text-foreground hover:bg-muted active:bg-muted";

export function SiteHeaderMobileNav({ profile }: { profile: HeaderProfile }) {
  const [open, setOpen] = useState(false);
  const showModeration =
    profile?.role === "MODERATOR" || profile?.role === "ADMIN";
  const showAdmin = profile?.role === "ADMIN";

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "shrink-0"
          )}
          aria-label="Open menu"
          type="button"
        >
          <MenuIcon className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="right" className="w-[min(100%,20rem)]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 px-2 pb-4" aria-label="Main">
            <Link href="/live" className={navLinkClass} onClick={() => setOpen(false)}>
              Live Scores
            </Link>
            <p className="px-3 pb-0.5 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sports
            </p>
            {SCHOOL_SPORTS.map((sport) => (
              <Link
                key={sport}
                href={`/sport/${sportToRouteSlug(sport)}`}
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                {schoolSportLabel(sport)}
              </Link>
            ))}
            <Link href="/results" className={navLinkClass} onClick={() => setOpen(false)}>
              Results
            </Link>
            <Link
              href="/submit"
              className={cn(navLinkClass, "font-medium text-primary")}
              onClick={() => setOpen(false)}
            >
              Submit
            </Link>
            <Link href="/find-school" className={navLinkClass} onClick={() => setOpen(false)}>
              Schools
            </Link>
            {profile ? (
              <Link href="/my-favourites" className={navLinkClass} onClick={() => setOpen(false)}>
                My favourites
              </Link>
            ) : null}
            {profile ? (
              <Link href="/add-team" className={navLinkClass} onClick={() => setOpen(false)}>
                Add school or team
              </Link>
            ) : null}
            {showModeration && !showAdmin ? (
              <Link
                href="/moderator"
                className={navLinkClass}
                onClick={() => setOpen(false)}
              >
                Moderation
              </Link>
            ) : null}
            {showAdmin ? (
              <Link
                href="/admin"
                className={cn(
                  navLinkClass,
                  "font-medium text-amber-700 dark:text-amber-400"
                )}
                onClick={() => setOpen(false)}
              >
                Admin
              </Link>
            ) : null}
            {!profile ? (
              <div className="mt-4 border-t pt-4">
                <Link
                  href="/login"
                  className={navLinkClass}
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>
              </div>
            ) : null}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
