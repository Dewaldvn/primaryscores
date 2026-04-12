"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProfileAvatar } from "@/components/profile-avatar";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import type { ProfileRole } from "@/lib/auth";

export function UserMenu({
  email,
  displayName,
  role,
  avatarUrl,
}: {
  email: string;
  displayName: string;
  role: ProfileRole;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  async function signOut() {
    try {
      const res = await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
      if (!res.ok) {
        console.error("[sign-out] route failed", res.status);
      }
    } catch (e) {
      console.error("[sign-out] fetch failed", e);
    }
    router.refresh();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "max-w-[min(100%,220px)] shrink-0 justify-between gap-2 px-2 font-normal"
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="xs" className="shrink-0" />
          <span className="truncate">{displayName}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex gap-2">
              <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="sm" className="shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col space-y-1">
                <span className="truncate text-sm">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
                <span className="text-xs text-muted-foreground">Role: {role}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/account")}>Profile & picture</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/my-submissions")}>My submissions</DropdownMenuItem>
          {(role === "MODERATOR" || role === "ADMIN") && (
            <DropdownMenuItem onClick={() => router.push("/moderator")}>Moderation</DropdownMenuItem>
          )}
          {role === "ADMIN" && (
            <DropdownMenuItem onClick={() => router.push("/admin/scores")}>Admin</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
