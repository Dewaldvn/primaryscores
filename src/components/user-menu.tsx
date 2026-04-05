"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProfileRole } from "@/lib/auth";

export function UserMenu({
  email,
  displayName,
  role,
}: {
  email: string;
  displayName: string;
  role: ProfileRole;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" size="sm" className="max-w-[200px] truncate">
          {displayName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <span className="truncate text-sm">{displayName}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
            <span className="text-xs text-muted-foreground">Role: {role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/my-submissions")}>
          My submissions
        </DropdownMenuItem>
        {(role === "MODERATOR" || role === "ADMIN") && (
          <DropdownMenuItem onClick={() => router.push("/moderator")}>Moderation</DropdownMenuItem>
        )}
        {role === "ADMIN" && (
          <DropdownMenuItem onClick={() => router.push("/admin/schools")}>Admin</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
