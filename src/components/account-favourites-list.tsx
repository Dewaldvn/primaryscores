"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleFavouriteSchoolAction } from "@/actions/favourite-schools";

export function AccountFavouritesList({
  schools,
}: {
  schools: { id: string; displayName: string; slug: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (schools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Favourite schools</CardTitle>
          <CardDescription>
            Open any school page and use <strong>Favourite school</strong> to pin teams you follow. They will appear
            in the bar at the top of the site when you are signed in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LinkButton variant="secondary" size="sm" href="/find-school">
            Find a school
          </LinkButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Favourite schools</CardTitle>
        <CardDescription>Quick links and activity for schools you follow.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {schools.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
              <Link href={`/schools/${s.slug}`} className="font-medium hover:underline">
                {s.displayName}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={pending}
                onClick={() => {
                  start(() => {
                    void (async () => {
                      const res = await toggleFavouriteSchoolAction(s.id);
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
