"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileAvatar } from "@/components/profile-avatar";
import { removeProfileAvatarAction, uploadProfileAvatarAction } from "@/actions/profile-avatar";

export function ProfileAccountClient({
  email,
  displayName,
  avatarUrl,
  hasAvatar,
}: {
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
        <CardDescription>Picture shown next to your name when you submit live scores.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} size="md" />
          <div className="flex flex-1 flex-col gap-2 text-sm">
            <p className="font-medium">{displayName}</p>
            <p className="text-muted-foreground">{email}</p>
            <div className="flex flex-wrap gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  start(() => {
                    void (async () => {
                      const fd = new FormData();
                      fd.set("file", file);
                      const res = await uploadProfileAvatarAction(fd);
                      if (!res.ok) {
                        if ("error" in res) toast.error(res.error);
                        return;
                      }
                      toast.success("Profile picture updated.");
                      router.refresh();
                    })();
                  });
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
              >
                {pending ? "Uploading…" : "Upload picture"}
              </Button>
              {hasAvatar ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    start(() => {
                      void (async () => {
                        const res = await removeProfileAvatarAction();
                        if (!res.ok) {
                          if ("error" in res) toast.error(res.error);
                          return;
                        }
                        toast.success("Picture removed.");
                        router.refresh();
                      })();
                    });
                  }}
                >
                  Remove picture
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">PNG or JPEG, up to 2 MB.</p>
          </div>
        </div>
        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="acc-dn">Display name</Label>
          <Input id="acc-dn" value={displayName} readOnly className="bg-muted/50" />
          <p className="text-xs text-muted-foreground">Name changes are not supported here yet.</p>
        </div>
      </CardContent>
    </Card>
  );
}
