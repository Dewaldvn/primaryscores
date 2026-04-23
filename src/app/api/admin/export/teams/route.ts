import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminListTeams } from "@/lib/data/admin";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);
  const rows = await adminListTeams();
  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));
  const headers = [
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
  const data = rows.map((r) => ({
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
    const body = rowsToXlsxBuffer(headers, data, "teams");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="teams.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, data), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="teams.csv"',
    },
  });
}
