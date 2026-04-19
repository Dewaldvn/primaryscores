import Link from "next/link";
import { notFound } from "next/navigation";
import { FindSchoolClient } from "@/components/find-school-client";
import { getSessionUser } from "@/lib/auth";
import { listProvinces, listSchoolsByProvince } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { parseSportQueryParam, schoolSportLabel } from "@/lib/sports";
import { parseTeamGenderQueryParam, teamGenderLabel } from "@/lib/team-gender";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function dedupeSchoolsById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Map<string, T>();
  for (const r of rows) {
    if (!seen.has(r.id)) seen.set(r.id, r);
  }
  return Array.from(seen.values());
}

type Props = { searchParams: Record<string, string | string[] | undefined> };

export const metadata = {
  title: "Find your school",
  description: "Search primary schools by name or browse by province.",
};

function qp(searchParams: Props["searchParams"], key: string): string | undefined {
  const v = searchParams[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

export default async function FindSchoolPage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) notFound();

  const rawProvince = qp(searchParams, "province");
  const provinceId = rawProvince && UUID_RE.test(rawProvince) ? rawProvince : null;
  const searchSport = parseSportQueryParam(qp(searchParams, "sport"));
  const searchGender = parseTeamGenderQueryParam(qp(searchParams, "gender"));

  const [provinces, user] = await Promise.all([listProvinces(), getSessionUser()]);
  const rawSchools = provinceId
    ? await listSchoolsByProvince(
        provinceId,
        250,
        searchSport ? { sport: searchSport, gender: searchGender } : undefined
      )
    : [];
  const schoolsInProvince = dedupeSchoolsById(rawSchools);
  const selectedProvinceName = provinceId ? provinces.find((p) => p.id === provinceId)?.name ?? null : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Find your school</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by name (live) or open a province to scroll the full directory. Open a school to see all its teams and
          favourite a specific side (U13, hockey girls, etc.).{" "}
          <Link href="/add-team" className="text-primary underline-offset-4 hover:underline">
            Missing a school or team?
          </Link>
          {searchSport ? (
            <>
              {" "}
              Search and province lists only include schools that have at least one active{" "}
              {schoolSportLabel(searchSport)}
              {searchSport === "HOCKEY" && searchGender ? ` (${teamGenderLabel(searchGender)})` : ""} team in the
              database.
            </>
          ) : null}
        </p>
        {searchSport === "HOCKEY" && !searchGender ? (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
            <span className="text-muted-foreground">Hockey name search:</span>
            <Link
              href="/find-school?sport=HOCKEY&gender=MALE"
              className="text-primary underline-offset-4 hover:underline"
            >
              Boys / men
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link
              href="/find-school?sport=HOCKEY&gender=FEMALE"
              className="text-primary underline-offset-4 hover:underline"
            >
              Girls / women
            </Link>
          </p>
        ) : null}
      </div>
      <FindSchoolClient
        provinces={provinces}
        schoolsInProvince={schoolsInProvince}
        selectedProvinceId={provinceId}
        selectedProvinceName={selectedProvinceName}
        searchSport={searchSport}
        searchGender={searchGender}
        signedIn={Boolean(user)}
      />
      <p className="text-center text-sm text-muted-foreground sm:text-left">
        Wrong school?{" "}
        <Link
          href={
            searchSport
              ? `/submit?sport=${searchSport}${searchGender ? `&gender=${searchGender}` : ""}`
              : "/submit"
          }
          className="text-primary underline-offset-4 hover:underline"
        >
          Submit a score
        </Link>{" "}
        from the match form.
      </p>
    </div>
  );
}
