import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/auth";
import { getCycle, getReportingCycle } from "@/lib/data";
import { buildCycleReport, csvEscape } from "@/lib/report";
import { REVIEW_STATUS, RATING_SCALE } from "@/lib/constants";

/** GET /api/admin/export?cycle=<id> → CSV of every employee's review status and ratings. HR Admin only. */
export async function GET(req: Request) {
  const me = await getCurrentEmployee();
  if (!me || !me.is_active || me.role !== "hr_admin") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cycleId = new URL(req.url).searchParams.get("cycle");
  const cycle = cycleId && /^[0-9a-f-]{36}$/i.test(cycleId) ? await getCycle(cycleId) : await getReportingCycle();
  if (!cycle) return NextResponse.json({ error: "No cycle" }, { status: 404 });

  const rows = await buildCycleReport(cycle.id);
  const label = (n: number | null | undefined) => RATING_SCALE.find((r) => r.value === n)?.label ?? "";
  const header = [
    "Employee", "Email", "Designation", "Department", "Manager", "Goals approved", "Goals total", "Status",
    "Self rating", "Self rating label", "Manager rating", "Manager rating label", "Self-appraisal submitted", "Manager reviewed", "Completed",
  ];
  const lines = rows.map((r) =>
    [
      r.employee.full_name, r.employee.email, r.employee.designation, r.employee.department, r.manager?.full_name ?? "",
      r.goalsApproved, r.goalsTotal, REVIEW_STATUS[r.status].label,
      r.review?.overall_self_rating ?? "", label(r.review?.overall_self_rating),
      r.review?.overall_manager_rating ?? "", label(r.review?.overall_manager_rating),
      r.review?.submitted_at?.slice(0, 10) ?? "", r.review?.reviewed_at?.slice(0, 10) ?? "", r.review?.completed_at?.slice(0, 10) ?? "",
    ].map(csvEscape).join(","),
  );
  const csv = "﻿" + [header.join(","), ...lines].join("\r\n"); // BOM so Excel reads UTF-8 (e.g. "–")
  const filename = `${cycle.name.replace(/[^\w-]+/g, "_")}_ratings.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
