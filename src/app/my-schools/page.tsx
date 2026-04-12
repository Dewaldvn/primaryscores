import type { Metadata } from "next";
import { MySchoolsContent } from "@/components/favourites-bar";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "My schools",
  description: "Schools you follow, recent verified results, and matching live games.",
};

export default async function MySchoolsPage() {
  await requireUser("/login?redirect=%2Fmy-schools");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My schools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schools you have favourited, recent verified results involving them, and open live games that match by name.
        </p>
      </div>
      <MySchoolsContent />
    </div>
  );
}
