import "server-only";
import { cache } from "react";
import { db, must } from "./supabase";
import type { Employee, Goal, GoalRating, Review, ReviewCycle } from "./types";

// Read helpers shared by pages and actions. They do NOT check permissions —
// callers must do that first (see src/lib/auth.ts).

export const getOpenCycle = cache(async (): Promise<ReviewCycle | null> => {
  return must(
    await db().from("review_cycles").select("*").eq("status", "open").maybeSingle(),
    "Load open cycle",
  ) as ReviewCycle | null;
});

export const getAllCycles = cache(async (): Promise<ReviewCycle[]> => {
  return must(
    await db().from("review_cycles").select("*").order("start_date", { ascending: false }),
    "Load cycles",
  ) as ReviewCycle[];
});

export async function getCycle(id: string): Promise<ReviewCycle | null> {
  return must(await db().from("review_cycles").select("*").eq("id", id).maybeSingle(), "Load cycle") as ReviewCycle | null;
}

/** The open cycle, else the most recent non-draft one — what reports default to. */
export async function getReportingCycle(): Promise<ReviewCycle | null> {
  const open = await getOpenCycle();
  if (open) return open;
  return (await getAllCycles()).find((c) => c.status === "closed") ?? null;
}

export const getAllEmployees = cache(async (): Promise<Employee[]> => {
  return must(await db().from("employees").select("*").order("full_name"), "Load employees") as Employee[];
});

export async function getEmployee(id: string): Promise<Employee | null> {
  return must(await db().from("employees").select("*").eq("id", id).maybeSingle(), "Load employee") as Employee | null;
}

export async function getDirectReports(managerId: string): Promise<Employee[]> {
  return must(
    await db().from("employees").select("*").eq("manager_id", managerId).eq("is_active", true).order("full_name"),
    "Load direct reports",
  ) as Employee[];
}

/** People `me` reviews: direct reports + (for HR) active staff with no manager. */
export async function getReviewees(me: Employee): Promise<Employee[]> {
  const direct = await getDirectReports(me.id);
  if (me.role !== "hr_admin") return direct;
  const topLevel = must(
    await db().from("employees").select("*").is("manager_id", null).eq("is_active", true).neq("id", me.id).order("full_name"),
    "Load top-level employees",
  ) as Employee[];
  return [...direct, ...topLevel];
}

export async function getGoals(employeeId: string, cycleId: string): Promise<Goal[]> {
  return must(
    await db().from("goals").select("*").eq("employee_id", employeeId).eq("cycle_id", cycleId).order("created_at"),
    "Load goals",
  ) as Goal[];
}

export async function getReview(employeeId: string, cycleId: string): Promise<Review | null> {
  return must(
    await db().from("reviews").select("*").eq("employee_id", employeeId).eq("cycle_id", cycleId).maybeSingle(),
    "Load review",
  ) as Review | null;
}

export async function getReviewById(id: string): Promise<Review | null> {
  return must(await db().from("reviews").select("*").eq("id", id).maybeSingle(), "Load review") as Review | null;
}

export async function getGoalRatings(reviewId: string): Promise<GoalRating[]> {
  return must(await db().from("goal_ratings").select("*").eq("review_id", reviewId), "Load goal ratings") as GoalRating[];
}

/**
 * Get the employee's review row for a cycle, creating it (Not Started) if
 * missing. manager_id is snapshotted from the employee's current manager.
 */
export async function ensureReview(employee: Employee, cycleId: string): Promise<Review> {
  const existing = await getReview(employee.id, cycleId);
  if (existing) return existing;
  const { data, error } = await db()
    .from("reviews")
    .upsert(
      { employee_id: employee.id, cycle_id: cycleId, manager_id: employee.manager_id, status: "not_started" },
      { onConflict: "employee_id,cycle_id", ignoreDuplicates: true },
    )
    .select("*");
  if (error) throw new Error(`Create review: ${error.message}`);
  return (data?.[0] as Review | undefined) ?? ((await getReview(employee.id, cycleId)) as Review);
}

/** When a cycle opens, every active employee gets a Not Started review row. */
export async function createReviewsForCycle(cycleId: string): Promise<number> {
  const active = (await getAllEmployees()).filter((e) => e.is_active);
  if (active.length === 0) return 0;
  const { error } = await db()
    .from("reviews")
    .upsert(
      active.map((e) => ({ employee_id: e.id, cycle_id: cycleId, manager_id: e.manager_id, status: "not_started" })),
      { onConflict: "employee_id,cycle_id", ignoreDuplicates: true },
    );
  if (error) throw new Error(`Create reviews for cycle: ${error.message}`);
  return active.length;
}

export async function getReviewsForCycle(cycleId: string): Promise<Review[]> {
  return must(await db().from("reviews").select("*").eq("cycle_id", cycleId), "Load cycle reviews") as Review[];
}

export async function getGoalsForCycle(cycleId: string): Promise<Goal[]> {
  return must(await db().from("goals").select("*").eq("cycle_id", cycleId), "Load cycle goals") as Goal[];
}
