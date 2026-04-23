"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteSchoolAction } from "@/actions/admin-crud";
import { Button } from "@/components/ui/button";

type SchoolDeleteButtonProps = {
  schoolId: string;
  returnHref: string;
};

export function SchoolDeleteButton({ schoolId, returnHref }: SchoolDeleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      disabled={pending}
      onClick={() => {
        const confirmed = window.confirm(
          "Delete this school and all of its teams? This cannot be undone. If the school is linked to fixtures/results, deletion may be blocked.",
        );
        if (!confirmed) return;

        startTransition(async () => {
          const res = await deleteSchoolAction({ id: schoolId });
          if (!res.ok) {
            toast.error(res.error ?? "Failed to delete school.");
            return;
          }
          toast.success("School deleted.");
          router.push(returnHref);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting..." : "Delete school"}
    </Button>
  );
}
