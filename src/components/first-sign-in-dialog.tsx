"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { completeFirstSignInOnboardingAction } from "@/actions/profile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function FirstSignInDialog({ openInitially }: { openInitially: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(openInitially);
  const [pending, start] = useTransition();

  function choose(target: "/account" | "/live" | "/apply-school-admin") {
    start(async () => {
      const res = await completeFirstSignInOnboardingAction();
      if (!res.ok) {
        toast.error("Could not save onboarding choice.");
        return;
      }
      if (target === "/account") {
        setOpen(false);
        router.refresh();
        return;
      }
      window.location.assign(target);
    });
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Welcome to your account</DialogTitle>
          <DialogDescription>
            Choose what you want to do first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="grid gap-2 sm:grid-cols-1">
          <Button disabled={pending} onClick={() => choose("/account")}>
            1) Complete my profile now
          </Button>
          <Button disabled={pending} variant="outline" onClick={() => choose("/live")}>
            2) No, take me to live scoring
          </Button>
          <Button disabled={pending} variant="secondary" onClick={() => choose("/apply-school-admin")}>
            3) I represent a school and want to claim admin rights
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
