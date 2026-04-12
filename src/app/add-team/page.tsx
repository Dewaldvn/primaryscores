import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddTeamWizard } from "@/components/add-team-wizard";
import { requireUser } from "@/lib/auth";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const metadata: Metadata = {
  title: "Add a school or team",
  description: "Search for a school, add it if missing, then add a team to the directory.",
};

export default async function AddTeamPage() {
  if (!isDatabaseConfigured()) notFound();
  await requireUser("/login?redirect=%2Fadd-team");
  const provinces = await listProvinces();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add a school or team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the database first. Choose an existing school to attach a new team, or add the school when it is not
          listed. Duplicates may be merged by moderators.
        </p>
      </div>
      <AddTeamWizard provinces={provinces} />
    </div>
  );
}
