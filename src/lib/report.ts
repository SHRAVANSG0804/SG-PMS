import "server-only";
import { getAllEmployees, getGoalsForCycle, getReviewsForCycle } from "./data";
import type { Employee, Review, ReviewStatus } from "./types";

export interface ReportRow {
  employee: Employee;
  manager: Employee | null;
  review: Review | null;
  status: ReviewStatus;
  goalsTotal: number;
  goalsApproved: number;
}

/** One row per active employee (plus anyone with a review in the cycle). */
export async function buildCycleReport(cycleId: string): Promise<ReportRow[]> {
  const [employees, reviews, goals] = await Promise.all([getAllEmployees(), getReviewsForCycle(cycleId), getGoalsForCycle(cycleId)]);
  const byId = new Map(employees.map((e) => [e.id, e]));
  const reviewByEmp = new Map(reviews.map((r) => [r.employee_id, r]));
  return employees
    .filter((e) => e.is_active || reviewByEmp.has(e.id))
    .map((e) => {
      const review = reviewByEmp.get(e.id) ?? null;
      const mine = goals.filter((g) => g.employee_id === e.id);
      const managerId = review?.manager_id ?? e.manager_id;
      return {
        employee: e,
        manager: managerId ? byId.get(managerId) ?? null : null,
        review,
        status: review?.status ?? "not_started",
        goalsTotal: mine.length,
        goalsApproved: mine.filter((g) => g.status === "approved").length,
      };
    });
}

export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
