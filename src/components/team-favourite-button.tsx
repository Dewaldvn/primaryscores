"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { toggleFavouriteTeamAction } from "@/actions/favourite-teams";

export function TeamFavouriteButton({
  teamId,
  signedIn,
  initialFavourited,
  loginRedirectPath,
  compact = false,
}: {
  teamId: string;
  signedIn: boolean;
  initialFavourited: boolean;
  loginRedirectPath: string;
  /** Smaller label when used in a dense list row. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [favourited, setFavourited] = useState(initialFavourited);

  if (!signedIn) {
    return (
      <LinkButton
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 px-2"
        href={`/login?redirect=${encodeURIComponent(loginRedirectPath)}`}
      >
        <Star className="size-4" aria-hidden />
        <span className="sr-only">Sign in to favourite this team</span>
      </LinkButton>
    );
  }

  return (
    <Button
      type="button"
      variant={favourited ? "secondary" : "ghost"}
      size="sm"
      className="h-8 shrink-0 gap-1 px-2"
      disabled={pending}
      onClick={() => {
        start(() => {
          void (async () => {
            const prev = favourited;
            setFavourited(!prev);
            const res = await toggleFavouriteTeamAction(teamId);
            if (!res.ok) {
              setFavourited(prev);
              toast.error("error" in res ? res.error : "Could not update favourite.");
              return;
            }
            setFavourited(res.favourited);
            toast.success(res.favourited ? "Team added to favourites." : "Removed from favourites.");
            router.refresh();
          })();
        });
      }}
      aria-pressed={favourited}
      title={favourited ? "Remove from favourites" : "Favourite this team"}
    >
      <Star className={`size-4 ${favourited ? "fill-current" : ""}`} aria-hidden />
      {!compact ? (
        <span className="text-xs">{favourited ? "Saved" : "Favourite"}</span>
      ) : null}
    </Button>
  );
}
