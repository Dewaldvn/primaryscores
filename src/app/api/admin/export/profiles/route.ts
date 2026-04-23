import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminListProfiles } from "@/lib/data/admin";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);
  const profiles = await adminListProfiles();
  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));
  const headers = ["id", "email", "display_name", "role", "onboarding_status", "created_at"];
  const data = profiles.map((p) => ({
    id: p.id,
    email: p.email,
    display_name: p.displayName,
    role: p.role,
    onboarding_status: p.onboardingStatus,
    created_at: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
  }));

  if (format === "xlsx") {
    const body = rowsToXlsxBuffer(headers, data, "profiles");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="users.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, data), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="users.csv"',
    },
  });
}
