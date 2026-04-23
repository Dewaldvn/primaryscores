"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { uploadSchoolLogoContributorAction } from "@/actions/school-logo";
import { contributorCreateSchoolAction, contributorCreateTeamAction } from "@/actions/contributor-school-team";
import { SchoolLogo } from "@/components/school-logo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";
import { TEAM_GENDERS, teamGenderLabel } from "@/lib/team-gender";
import { DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE } from "@/lib/school-default-teams";

export type ContributorReturnTo = "find-school" | "add-team";

export type ContributorNewSchoolOnSuccessMeta = { logoUploaded: boolean };

type ProvinceRow = { id: string; name: string };

type NewSchoolSuccessPayload = { id: string; displayName: string; slug: string };

function ContributorSchoolLogoUploadBlock({
  schoolId,
  displayName,
  returnTo,
}: {
  schoolId: string;
  displayName: string;
  returnTo: ContributorReturnTo;
}) {
  const router = useRouter();
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fieldId = useId();

  return (
    <div className="space-y-2 rounded-lg border bg-muted/25 p-3 sm:col-span-2">
      <Label htmlFor={`${fieldId}-crest`}>School crest (optional)</Label>
      <div className="flex flex-wrap items-center gap-4">
        <SchoolLogo logoPath={logoPath} alt={displayName} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <input
            id={`${fieldId}-crest`}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            disabled={uploading}
            className="max-w-xs text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("schoolId", schoolId);
              fd.set("file", file);
              fd.set("_returnTo", returnTo);
              setUploading(true);
              void uploadSchoolLogoContributorAction(fd).then((res) => {
                setUploading(false);
                e.target.value = "";
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Logo saved.");
                setLogoPath(res.logoPath);
                router.refresh();
              });
            }}
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, GIF, or SVG — max 2 MB. Only while this school has no logo yet; contact an admin to change
            it later.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContributorNewSchoolForm({
  provinces,
  defaultDisplayName,
  defaultOfficialName,
  returnTo,
  onSuccess,
  onBack,
  showBack,
}: {
  provinces: ProvinceRow[];
  defaultDisplayName: string;
  defaultOfficialName: string;
  returnTo: ContributorReturnTo;
  onSuccess: (school: NewSchoolSuccessPayload, meta: ContributorNewSchoolOnSuccessMeta) => void;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [crestFile, setCrestFile] = useState<File | null>(null);
  const [crestPreviewUrl, setCrestPreviewUrl] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<"PRIMARY" | "SECONDARY" | "COMBINED">("PRIMARY");
  const [selectedDefaultTeamCodes, setSelectedDefaultTeamCodes] = useState<Set<string>>(
    new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.PRIMARY),
  );
  const baseId = useId();

  useEffect(() => {
    return () => {
      if (crestPreviewUrl) URL.revokeObjectURL(crestPreviewUrl);
    };
  }, [crestPreviewUrl]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add your school</CardTitle>
        <CardDescription>
          Enter accurate names so moderators can spot duplicates. You will add a team on the next step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid max-w-xl gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setPending(true);
            void (async () => {
              try {
                const res = await contributorCreateSchoolAction({
                  officialName: fd.get("officialName"),
                  displayName: fd.get("displayName"),
                  schoolType,
                  defaultTeamCodes: Array.from(selectedDefaultTeamCodes),
                  provinceId: fd.get("provinceId"),
                  town: fd.get("town") || null,
                  website: fd.get("website") || null,
                  active: true,
                  _returnTo: returnTo,
                });
                if (!res.ok) {
                  if ("fieldErrors" in res && res.fieldErrors) {
                    toast.error("Check required fields and website URL.");
                  } else {
                    toast.error("Could not add school.");
                  }
                  return;
                }

                const schoolPayload: NewSchoolSuccessPayload = {
                  id: res.schoolId,
                  displayName: res.displayName,
                  slug: res.slug,
                };

                let logoUploaded = false;
                if (crestFile) {
                  const logoFd = new FormData();
                  logoFd.set("schoolId", res.schoolId);
                  logoFd.set("file", crestFile);
                  logoFd.set("_returnTo", returnTo);
                  const logoRes = await uploadSchoolLogoContributorAction(logoFd);
                  if (!logoRes.ok) {
                    toast.error(logoRes.error);
                  } else {
                    logoUploaded = true;
                  }
                }

                if (!crestFile) {
                  toast.success("School added with default teams. Add any extra team below if needed.");
                } else if (logoUploaded) {
                  toast.success("School added with crest and default teams. Add any extra team below if needed.");
                } else {
                  toast.success("School added with default teams. Add any extra team below if needed.");
                  toast.error("Crest did not upload — you can try again on the next step.");
                }

                onSuccess(schoolPayload, { logoUploaded });
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-displayName`}>Display name *</Label>
            <Input
              id={`${baseId}-displayName`}
              name="displayName"
              required
              placeholder="Name most people use"
              defaultValue={defaultDisplayName}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-officialName`}>Official name *</Label>
            <Input
              id={`${baseId}-officialName`}
              name="officialName"
              required
              placeholder="Registered name if different"
              defaultValue={defaultOfficialName}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>School type</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${baseId}-schoolType`}
                  value="PRIMARY"
                  checked={schoolType === "PRIMARY"}
                  onChange={() => {
                    setSchoolType("PRIMARY");
                    setSelectedDefaultTeamCodes(new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.PRIMARY));
                  }}
                />
                Primary School
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${baseId}-schoolType`}
                  value="SECONDARY"
                  checked={schoolType === "SECONDARY"}
                  onChange={() => {
                    setSchoolType("SECONDARY");
                    setSelectedDefaultTeamCodes(new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.SECONDARY));
                  }}
                />
                Secondary School
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`${baseId}-schoolType`}
                  value="COMBINED"
                  checked={schoolType === "COMBINED"}
                  onChange={() => {
                    setSchoolType("COMBINED");
                    setSelectedDefaultTeamCodes(new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.COMBINED));
                  }}
                />
                Combined School
              </label>
            </div>
          </div>
          <div className="space-y-2 rounded-lg border bg-muted/25 p-3 sm:col-span-2">
            <Label>Default teams to add (all sports)</Label>
            <p className="text-xs text-muted-foreground">
              Deselect any defaults you do not want to create for this new school.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[schoolType].map((code) => (
                <label key={code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDefaultTeamCodes.has(code)}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setSelectedDefaultTeamCodes((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(code);
                        else next.delete(code);
                        return next;
                      });
                    }}
                  />
                  {code}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-provinceId`}>Province *</Label>
            <select
              id={`${baseId}-provinceId`}
              name="provinceId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">Select province…</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-town`}>Town</Label>
            <Input id={`${baseId}-town`} name="town" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-website`}>Website</Label>
            <Input id={`${baseId}-website`} name="website" type="url" placeholder="https://…" />
          </div>
          <div className="space-y-2 sm:col-span-2 rounded-lg border bg-muted/25 p-3">
            <Label htmlFor={`${baseId}-crest`}>School crest (optional)</Label>
            <div className="flex flex-wrap items-center gap-4">
              {crestPreviewUrl ? (
                // Local preview uses blob: URLs from file input; next/image optimization is not needed here.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={crestPreviewUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-center text-[10px] leading-tight text-muted-foreground">
                  Preview
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                  id={`${baseId}-crest`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  disabled={pending}
                  className="max-w-xs text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0] ?? null;
                    setCrestFile(f);
                    setCrestPreviewUrl((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return f ? URL.createObjectURL(f) : null;
                    });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP, GIF, or SVG — max 2 MB. Saved right after the school is created.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {showBack && onBack ? (
              <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              Add school & continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ContributorAddTeamForm({
  school,
  returnTo,
  onBack,
  showBack,
  allowSchoolLogoUpload = false,
}: {
  school: { id: string; displayName: string; slug: string };
  returnTo: ContributorReturnTo;
  onBack?: () => void;
  showBack?: boolean;
  /** When true (e.g. new school or search hit without a crest), show optional crest upload before team fields. */
  allowSchoolLogoUpload?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [sport, setSport] = useState<SchoolSport>("RUGBY");
  const baseId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a team</CardTitle>
        <CardDescription>
          School: <strong>{school.displayName}</strong> — describe the side (sport, age group, label).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowSchoolLogoUpload ? (
          <ContributorSchoolLogoUploadBlock
            schoolId={school.id}
            displayName={school.displayName}
            returnTo={returnTo}
          />
        ) : null}
        <form
          className="grid max-w-xl gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setPending(true);
            void contributorCreateTeamAction({
              schoolId: school.id,
              sport: fd.get("sport"),
              gender: sport === "HOCKEY" ? fd.get("gender") : null,
              ageGroup: fd.get("ageGroup"),
              teamLabel: fd.get("teamLabel"),
              teamNickname: fd.get("teamNickname"),
              isFirstTeam: true,
              active: fd.get("active") === "on",
              _returnTo: returnTo,
            }).then((res) => {
              setPending(false);
              if (!res.ok) {
                if ("fieldErrors" in res && res.fieldErrors) {
                  toast.error("Check the form (hockey needs a boys or girls side).");
                  return;
                }
                toast.error("error" in res ? res.error : "Could not add team.");
                return;
              }
              toast.success("Team added.");
              router.push(`/schools/${res.schoolSlug}#teams`);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="schoolId" value={school.id} />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor={`${baseId}-sport`}>Sport</Label>
            <select
              id={`${baseId}-sport`}
              name="sport"
              required
              value={sport}
              onChange={(ev) => setSport(ev.target.value as SchoolSport)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {SCHOOL_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {schoolSportLabel(s)}
                </option>
              ))}
            </select>
          </div>
          {sport === "HOCKEY" ? (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor={`${baseId}-gender`}>Hockey side *</Label>
              <select
                id={`${baseId}-gender`}
                name="gender"
                required
                defaultValue=""
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="" disabled>
                  Select boys or girls…
                </option>
                {TEAM_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {teamGenderLabel(g)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-ageGroup`}>Age group</Label>
            <Input
              id={`${baseId}-ageGroup`}
              name="ageGroup"
              defaultValue="U"
              placeholder="U plus age (e.g. type 13 for U13)"
              required
            />
            <p className="text-xs text-muted-foreground">
              The letter U is added automatically if you only type the number.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-teamLabel`}>Team Label (e.g. A, B, C etc)</Label>
            <Input
              id={`${baseId}-teamLabel`}
              name="teamLabel"
              onBlur={(e) => {
                e.currentTarget.value = e.currentTarget.value.toUpperCase();
              }}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${baseId}-teamNickname`}>Team nickname</Label>
            <Input id={`${baseId}-teamNickname`} name="teamNickname" placeholder="Optional" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" name="active" id={`${baseId}-active-t`} defaultChecked />
            <Label htmlFor={`${baseId}-active-t`}>Active</Label>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            {showBack && onBack ? (
              <Button type="button" variant="outline" onClick={onBack} disabled={pending}>
                Back
              </Button>
            ) : null}
            <Button type="submit" disabled={pending}>
              Save team
            </Button>
            <Link
              href={`/schools/${school.slug}`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "inline-flex items-center justify-center"
              )}
            >
              Open school
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
