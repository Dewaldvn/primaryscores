import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminListSchoolsForExport, adminListTeamsForExport } from "@/lib/data/admin";
import { parseTabularFormat, rowsToCsv } from "@/lib/tabular";
import * as XLSX from "xlsx";

function qps(req: NextRequest, key: string): string[] {
  return req.nextUrl.searchParams.getAll(key).map((s) => s.trim()).filter(Boolean);
}

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);
  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));

  const schoolIds = qps(req, "schoolId");
  const teamIds = qps(req, "teamId");
  const provinceIds = qps(req, "provinceId");

  const schoolRows = await adminListSchoolsForExport({ schoolIds, provinceIds });
  const schoolsHeaders = ["id", "slug", "display_name", "official_name", "province", "province_id", "active", "town"];
  const schoolsData = schoolRows.map((r) => ({
    id: r.school.id,
    slug: r.school.slug,
    display_name: r.school.displayName,
    official_name: r.school.officialName,
    province: r.provinceName,
    province_id: r.provinceId,
    active: r.school.active,
    town: r.school.town ?? "",
  }));

  // Teams are exported only in Excel format (CSV cannot contain multiple sheets).
  // If teams are selected explicitly, export those; otherwise export teams for selected schools/provinces.
  const teamsScopeSchoolIds = schoolIds.length ? schoolIds : schoolRows.map((r) => r.school.id);
  const teamRows =
    format === "xlsx"
      ? await adminListTeamsForExport({
          teamIds,
          schoolIds: teamIds.length ? undefined : teamsScopeSchoolIds,
          provinceIds: teamIds.length ? undefined : provinceIds,
        })
      : [];
  const teamsHeaders = [
    "team_id",
    "school_id",
    "school_name",
    "sport",
    "gender",
    "age_group",
    "team_label",
    "team_nickname",
    "active",
    "is_first_team",
  ];
  const teamsData = teamRows.map((r) => ({
    team_id: r.team.id,
    school_id: r.schoolId,
    school_name: r.schoolName,
    sport: r.team.sport,
    gender: r.team.gender ?? "",
    age_group: r.team.ageGroup,
    team_label: r.team.teamLabel,
    team_nickname: r.team.teamNickname ?? "",
    active: r.team.active,
    is_first_team: r.team.isFirstTeam,
  }));

  if (format === "xlsx") {
    // Build a workbook with 2 sheets.
    const wb = XLSX.utils.book_new();
    const wsSchools = XLSX.utils.json_to_sheet(schoolsData, { header: schoolsHeaders });
    XLSX.utils.book_append_sheet(wb, wsSchools, "schools");
    const wsTeams = XLSX.utils.json_to_sheet(teamsData, { header: teamsHeaders });
    XLSX.utils.book_append_sheet(wb, wsTeams, "teams");
    const body = XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="schools-and-teams.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(schoolsHeaders, schoolsData), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="schools.csv"',
    },
  });
}
