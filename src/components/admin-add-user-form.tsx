"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUserAsAdminAction } from "@/actions/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileRole } from "@/lib/auth";

const ROLES: readonly ProfileRole[] = ["CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"] as const;

export function AdminAddUserForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        const form = e.currentTarget;
        const fd = new FormData(form);
        const displayName = String(fd.get("displayName") ?? "").trim();
        const email = String(fd.get("email") ?? "").trim();
        const password = String(fd.get("password") ?? "");
        const role = String(fd.get("role") ?? "CONTRIBUTOR") as ProfileRole;
        startTransition(() => {
          void createUserAsAdminAction({ email, password, displayName, role }).then((res) => {
            if (res.ok) {
              toast.success("User created. They can sign in with the email and password you set.");
              form.reset();
              router.refresh();
            } else {
              if ("fieldErrors" in res && res.fieldErrors) {
                const first = Object.values(res.fieldErrors).flat()[0];
                if (first) {
                  setMessage(first);
                  toast.error(first);
                  return;
                }
              }
              const err = "error" in res ? res.error : "Could not create user";
              setMessage(err);
              toast.error(err);
            }
          });
        });
      }}
    >
      {message ? <p className="text-sm text-destructive">{message}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="add-user-name">Display name</Label>
          <Input
            id="add-user-name"
            name="displayName"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={80}
            required
            placeholder="How they will appear in the app"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-user-email">Email</Label>
          <Input
            id="add-user-email"
            name="email"
            type="email"
            autoComplete="off"
            required
            placeholder="name@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-user-password">Initial password</Label>
          <Input
            id="add-user-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            placeholder="At least 6 characters"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-user-role">Role</Label>
          <select
            id="add-user-role"
            name="role"
            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            defaultValue="CONTRIBUTOR"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create user"}
      </Button>
    </form>
  );
}
