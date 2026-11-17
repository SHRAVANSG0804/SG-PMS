import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, must } from "./supabase";
import type { Employee, Review, Role } from "./types";

/**
 * Who is signed in, as an EMPLOYEE (not just as a Clerk user)?
 *
 * Runs on the SERVER only. Steps:
 *  1. Ask Clerk for the signed-in user id (from the session cookie).
 *  2. Look for an employees row already linked to that Clerk id.
 *  3. First sign-in: no row is linked yet, so match one of the user's VERIFIED
 *     e-mail addresses against employees.email and store clerk_user_id on it.
 *     HR must have added the person first — that is how roles stay under HR control.
 *
 * `cache()` means this runs once per request even if many components call it.
 */
export const getCurrentEmployee = cache(async (): Promise<Employee | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const linked = must(
    await db().from("employees").select("*").eq("clerk_user_id", userId).maybeSingle(),
    "Load signed-in employee",
  ) as Employee | null;
  if (linked) return linked;

  const user = await currentUser();
  const emails = (user?.emailAddresses ?? [])
    .filter((e) => e.verification?.status === "verified")
    .map((e) => e.emailAddress.toLowerCase());
  if (emails.length === 0) return null;

  // Only claim a row that is not yet linked to some other Clerk account.
  const claimed = must(
    await db()
      .from("employees")
      .update({ clerk_user_id: userId })
      .in("email", emails)
      .is("clerk_user_id", null)
      .select("*"),
    "Link Clerk user to employee",
  ) as Employee[];

  return claimed[0] ?? null;
});

/** For pages: signed-in AND known AND active, otherwise redirect. */
export async function requireEmployee(): Promise<Employee> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const me = await getCurrentEmployee();
  if (!me || !me.is_active) redirect("/not-registered");
  return me;
}

export async function requireRole(...roles: Role[]): Promise<Employee> {
  const me = await requireEmployee();
  // 404 rather than 403: do not even confirm that an admin page exists.
  if (!roles.includes(me.role)) notFound();
  return me;
}

/** Ids of the people who report directly to this employee. */
export const getDirectReportIds = cache(async (managerId: string): Promise<string[]> => {
  const rows = must(
    await db().from("employees").select("id").eq("manager_id", managerId).eq("is_active", true),
    "Load direct reports",
  ) as { id: string }[];
  return rows.map((r) => r.id);
});

/** "Manager" is a capability, not a separate person: role=manager OR anyone with reports. */
export async function isManager(me: Employee): Promise<boolean> {
  if (me.role === "manager") return true;
  return (await getDirectReportIds(me.id)).length > 0;
}

/**
 * May `me` approve goals / write the review for `target`?
 * - Their direct manager, always.
 * - HR Admin, but ONLY for people who have no manager (top of the tree),
 *   so nobody is ever stuck without an approver. Never for themselves.
 */
export function canManage(me: Employee, target: Pick<Employee, "id" | "manager_id">): boolean {
  if (target.id === me.id) return false;
  if (target.manager_id === me.id) return true;
  return target.manager_id === null && me.role === "hr_admin";
}

/** Same rule, applied to a review row (whose manager_id is the reviewer snapshot). */
export function canReview(me: Employee, review: Pick<Review, "employee_id" | "manager_id">): boolean {
  if (review.employee_id === me.id) return false;
  if (review.manager_id === me.id) return true;
  return review.manager_id === null && me.role === "hr_admin";
}
