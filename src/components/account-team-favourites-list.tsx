"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleFavouriteTeamAction } from "@/actions/favourite-teams";
import { formatTeamListingSubtitle } from "@/lib/format-team";
import type { FavouriteTeamRow } from "@/lib/data/favourite-teams";

export function AccountTeamFavouritesList({
  teams,
}: {
  teams: FavouriteTeamRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Favourite teams</CardTitle>
          <CardDescription>
            Open a school from <Link href="/find-school">Find a school</Link>, scroll to{" "}
            <strong>Teams</strong>, and tap the star next to a side (e.g. U13 rugby or U16 hockey girls).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <LinkButton variant="secondary" size="sm" href="/find-school">
              Find a school
            </LinkButton>
            <LinkButton variant="outline" size="sm" href="/add-team">
              Add school or team
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Favourite teams</CardTitle>
        <CardDescription>Sides you follow for quick access on the home page.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {teams.map((t) => (
            <li
              key={t.teamId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
            >
              <div className="min-w-0">
                <Link href={`/schools/${t.schoolSlug}#teams`} className="font-medium hover:underline">
                  {t.schoolName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {formatTeamListingSubtitle({
                    sport: t.sport,
                    ageGroup: t.ageGroup,
                    teamLabel: t.teamLabel,
                    gender: t.gender,
                  })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() => {
                  start(() => {
                    void (async () => {
                      const res = await toggleFavouriteTeamAction(t.teamId);
                      if (!res.ok) {
                        toast.error("error" in res ? res.error : "Could not remove.");
                        return;
                      }
                      toast.success("Removed from favourites.");
                      router.refresh();
                    })();
                  });
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
