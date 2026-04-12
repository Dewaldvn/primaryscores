"use client";

import { useState } from "react";
import { ContributorAddTeamForm, ContributorNewSchoolForm } from "@/components/contributor-school-team-forms";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
type ProvinceOption = { id: string; name: string };

export function FindSchoolNoResultsAdd({
  nameHint,
  provinces,
  signedIn,
}: {
  nameHint: string;
  provinces: ProvinceOption[];
  signedIn: boolean;
}) {
  const [step, setStep] = useState<"school" | "team">("school");
  const [school, setSchool] = useState<{ id: string; displayName: string; slug: string } | null>(null);
  /** After school step, hide team-step crest upload if a crest was already saved. */
  const [allowTeamLogoUpload, setAllowTeamLogoUpload] = useState(true);

  if (!signedIn) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Add this school and a team</CardTitle>
          <CardDescription>
            Nothing matched &quot;{nameHint}&quot;. Sign in to add the school and the first team to the directory.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <LinkButton href="/login?redirect=%2Ffind-school">Sign in to add</LinkButton>
          <LinkButton href="/add-team" variant="outline">
            Open add form
          </LinkButton>
        </CardContent>
      </Card>
    );
  }

  if (step === "team" && school) {
    return (
      <ContributorAddTeamForm
        school={school}
        returnTo="find-school"
        allowSchoolLogoUpload={allowTeamLogoUpload}
      />
    );
  }

  return (
    <ContributorNewSchoolForm
      provinces={provinces}
      defaultDisplayName={nameHint}
      defaultOfficialName={nameHint}
      returnTo="find-school"
      onSuccess={(s, meta) => {
        setSchool(s);
        setAllowTeamLogoUpload(!meta.logoUploaded);
        setStep("team");
      }}
    />
  );
}
