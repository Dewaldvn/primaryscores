"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { toggleFavouriteSchoolAction } from "@/actions/favourite-schools";

export function SchoolFavouriteButton({
  schoolId,
  signedIn,
  initialFavourited,
  loginRedirectPath,
}: {
  schoolId: string;
  signedIn: boolean;
  initialFavourited: boolean;
  /** Path only, e.g. `/schools/foo` — used for sign-in link when logged out. */
  loginRedirectPath: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [favourited, setFavourited] = useState(initialFavourited);

  if (!signedIn) {
    return (
      <LinkButton variant="outline" size="sm" href={`/login?redirect=${encodeURIComponent(loginRedirectPath)}`}>
        <Star className="mr-1.5 size-4" aria-hidden />
        Sign in to favourite
      </LinkButton>
    );
  }

  return (
    <Button
      type="button"
      variant={favourited ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => {
        start(() => {
          void (async () => {
            const prev = favourited;
            setFavourited(!prev);
            const res = await toggleFavouriteSchoolAction(schoolId);
            if (!res.ok) {
              setFavourited(prev);
              toast.error("error" in res ? res.error : "Could not update favourite.");
              return;
            }
            setFavourited(res.favourited);
            toast.success(res.favourited ? "Added to your favourites." : "Removed from favourites.");
            router.refresh();
          })();
        });
      }}
      aria-pressed={favourited}
    >
      <Star className={`mr-1.5 size-4 ${favourited ? "fill-current" : ""}`} aria-hidden />
      {favourited ? "Favourited" : "Favourite school"}
    </Button>
  );
}
