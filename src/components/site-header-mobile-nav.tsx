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
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";

const navLinkClass =
  "rounded-md px-3 py-2.5 text-base text-foreground hover:bg-muted active:bg-muted";

const sportSubLinkClass =
  "rounded-md py-1.5 pl-8 pr-3 text-sm text-muted-foreground hover:bg-muted active:bg-muted";

function sportQueryPath(base: string, sport: SchoolSport) {
  return `${base}?sport=${encodeURIComponent(sport)}`;
}

export function SiteHeaderMobileNav({ profile }: { profile: HeaderProfile }) {
  const [open, setOpen] = useState(false);
  const showModeration =
    profile?.role === "MODERATOR" || profile?.role === "ADMIN";
  const showAdmin = profile?.role === "ADMIN";
  const showSchoolAdmin = profile?.role === "SCHOOL_ADMIN";

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
        <SheetContent
          side="right"
          className={cn(
            "w-[min(100%,20rem)] max-h-[100dvh] gap-0 overflow-hidden p-0",
            "flex h-full flex-col"
          )}
        >
          <SheetHeader className="shrink-0 border-b border-border/50 px-4 pb-3 pt-4">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav
            className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-y-contain px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
            aria-label="Main"
          >
            <Link href="/live" className={navLinkClass} onClick={() => setOpen(false)}>
              Live Scores (all sports)
            </Link>
            {SCHOOL_SPORTS.map((sport) => (
              <Link
                key={`live-${sport}`}
                href={sportQueryPath("/live", sport)}
                className={sportSubLinkClass}
                onClick={() => setOpen(false)}
              >
                Live · {schoolSportLabel(sport)}
              </Link>
            ))}
            <Link href="/results" className={navLinkClass} onClick={() => setOpen(false)}>
              Results (all sports)
            </Link>
            {SCHOOL_SPORTS.map((sport) => (
              <Link
                key={`results-${sport}`}
                href={sportQueryPath("/results", sport)}
                className={sportSubLinkClass}
                onClick={() => setOpen(false)}
              >
                Results · {schoolSportLabel(sport)}
              </Link>
            ))}
            <Link href="/submit" className={navLinkClass} onClick={() => setOpen(false)}>
              Submit (all sports)
            </Link>
            {SCHOOL_SPORTS.map((sport) => (
              <Link
                key={`submit-${sport}`}
                href={sportQueryPath("/submit", sport)}
                className={cn(sportSubLinkClass, "text-primary")}
                onClick={() => setOpen(false)}
              >
                Submit · {schoolSportLabel(sport)}
              </Link>
            ))}
            <Link href="/find-school" className={navLinkClass} onClick={() => setOpen(false)}>
              Schools
            </Link>
            <Link href="/about" className={navLinkClass} onClick={() => setOpen(false)}>
              About
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
            {showSchoolAdmin ? (
              <Link href="/school-admin" className={navLinkClass} onClick={() => setOpen(false)}>
                School admin
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
