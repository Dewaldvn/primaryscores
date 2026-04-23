"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import type { ProfileRole } from "@/lib/auth";

const menuContentClass = cn(
  "z-[250] min-w-[14rem] overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
);

const menuItemClass = cn(
  "relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none",
  "focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
);

const menuLabelClass = "px-2 py-1.5 text-xs font-medium text-muted-foreground";

const separatorClass = "-mx-1 my-1 h-px bg-border";

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

  function signOut() {
    // Use hard navigation so the browser fully reloads after cookies are cleared server-side.
    window.location.assign("/api/auth/sign-out?redirect=/");
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "max-w-[min(100%,220px)] shrink-0 justify-between gap-2 px-2 font-normal"
          )}
          aria-haspopup="menu"
          aria-label="Account menu"
        >
          <span className="pointer-events-none flex min-w-0 flex-1 items-center gap-2">
            <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="xs" className="shrink-0" />
            <span className="truncate">{displayName}</span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={menuContentClass}
          sideOffset={6}
          align="end"
          collisionPadding={12}
        >
          <div className={cn(menuLabelClass, "font-normal")}>
            <div className="flex gap-2">
              <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="sm" className="shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col space-y-1">
                <span className="truncate text-sm text-foreground">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email}</span>
                <span className="text-xs text-muted-foreground">Role: {role}</span>
              </div>
            </div>
          </div>

          <DropdownMenu.Separator className={separatorClass} />

          <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/account")}>
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/my-favourites")}>
            My favourites
          </DropdownMenu.Item>
          <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/my-submissions")}>
            My submissions
          </DropdownMenu.Item>
          {role === "SCHOOL_ADMIN" && (
            <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/school-admin")}>
              School admin
            </DropdownMenu.Item>
          )}
          {role !== "ADMIN" && (
            <>
              <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/add-team")}>
                Add a school or team
              </DropdownMenu.Item>
              <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/apply-school-admin")}>
                Apply for school admin privileges
              </DropdownMenu.Item>
            </>
          )}
          {(role === "MODERATOR" || role === "ADMIN") && (
            <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/moderator")}>
              Moderation
            </DropdownMenu.Item>
          )}
          {role === "ADMIN" && (
            <DropdownMenu.Item className={menuItemClass} onSelect={() => router.push("/admin/scores")}>
              Admin
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className={separatorClass} />

          <DropdownMenu.Item className={menuItemClass} onSelect={() => signOut()}>
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
