"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTeamAction } from "@/actions/admin-crud";
import { Button } from "@/components/ui/button";

type TeamDeleteButtonProps = {
  teamId: string;
  returnHref: string;
};

export function TeamDeleteButton({ teamId, returnHref }: TeamDeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        const confirmed = window.confirm(
          "Delete this team? This cannot be undone. If this team is already used in fixtures/results, deletion may be blocked.",
        );
        if (!confirmed) return;

        startTransition(async () => {
          const res = await deleteTeamAction({ id: teamId });
          if (!res.ok) {
            toast.error(res.error ?? "Failed to delete team.");
            return;
          }
          toast.success("Team deleted.");
          router.push(returnHref);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting..." : "Delete team"}
    </Button>
  );
}
