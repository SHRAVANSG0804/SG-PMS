"use server";

import { revalidatePath } from "next/cache";
import { canManage, canReview, requireEmployee } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { emailGoalSentBack, emailReviewCompleted } from "@/lib/email";
import { getEmployee, getGoals, getOpenCycle, getReview } from "@/lib/data";
import type { ActionState, Employee, Goal } from "@/lib/types";

const MIN_COMMENT = 10;

/**
 * Every manager action starts here: load the target employee, check that the
 * signed-in user is allowed to manage them, and that a cycle is open.
 * The employee id comes from the URL, so it is treated as untrusted input.
 */
async function managerContext(employeeId: string) {
  const me = await requireEmployee();
  const employee = await getEmployee(employeeId);
  if (!employee || !canManage(me, employee)) return { error: "You are not this employee's manager." } as const;
  const cycle = await getOpenCycle();
  if (!cycle) return { error: "There is no open review cycle." } as const;
  return { me, employee, cycle } as const;
}

async function loadSubmittedGoal(employee: Employee, cycleId: string, goalId: string): Promise<Goal | null> {
  const goal = (await getGoals(employee.id, cycleId)).find((g) => g.id === goalId);
  return goal && goal.status === "submitted" ? goal : null;
}

function refresh(employeeId: string) {
  revalidatePath(`/team/${employeeId}`);
  revalidatePath("/team");
  revalidatePath("/dashboard");
}

export async function approveGoal(employeeId: string, goalId: string): Promise<ActionState> {
  const ctx = await managerContext(employeeId);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const goal = await loadSubmittedGoal(ctx.employee, ctx.cycle.id, goalId);
  if (!goal) return { ok: false, message: "Only goals pending approval can be approved." };

  const { error } = await db()
    .from("goals")
    .update({ status: "approved", approved_at: new Date().toISOString(), manager_comment: null })
    .eq("id", goal.id)
    .eq("status", "submitted");
  if (error) return { ok: false, message: error.message };
  await audit(ctx.me.id, "goal.approved", "goal", goal.id, { employee_id: employeeId });
  refresh(employeeId);
  return { ok: true, message: "Goal approved." };
}

export async function approveAllGoals(employeeId: string): Promise<ActionState> {
  const ctx = await managerContext(employeeId);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const pending = (await getGoals(employeeId, ctx.cycle.id)).filter((g) => g.status === "submitted");
  if (pending.length === 0) return { ok: false, message: "No goals are pending approval." };
  const { error } = await db()
    .from("goals")
    .update({ status: "approved", approved_at: new Date().toISOString(), manager_comment: null })
    .in("id", pending.map((g) => g.id))
    .eq("status", "submitted");
  if (error) return { ok: false, message: error.message };
  await audit(ctx.me.id, "goals.approved_all", "employee", employeeId, { goal_ids: pending.map((g) => g.id) });
  refresh(employeeId);
  return { ok: true, message: `${pending.length} goal(s) approved.` };
}

export async function sendBackGoal(employeeId: string, goalId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await managerContext(employeeId);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  if (comment.length < MIN_COMMENT) {
    return { ok: false, message: "A comment is required when sending a goal back.", fieldErrors: { comment: `Explain what to change (at least ${MIN_COMMENT} characters)` } };
  }
  const goal = await loadSubmittedGoal(ctx.employee, ctx.cycle.id, goalId);
  if (!goal) return { ok: false, message: "Only goals pending approval can be sent back." };

  const { error } = await db().from("goals").update({ status: "sent_back", manager_comment: comment }).eq("id", goal.id).eq("status", "submitted");
  if (error) return { ok: false, message: error.message };
  await audit(ctx.me.id, "goal.sent_back", "goal", goal.id, { employee_id: employeeId, comment });
  await emailGoalSentBack({ employeeEmail: ctx.employee.email, employeeName: ctx.employee.full_name, goalTitle: goal.title, comment });
  refresh(employeeId);
  return { ok: true, message: "Goal sent back with your comment." };
}

function rating(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/**
 * Save (intent=draft) or submit (intent=submit) the manager's review.
 * Submit moves Self-Appraisal Submitted → Manager Reviewed. The manager can
 * still adjust it while it is Manager Reviewed, until they Complete it.
 */
export async function saveManagerReview(employeeId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await managerContext(employeeId);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";

  const review = await getReview(employeeId, ctx.cycle.id);
  if (!review || !canReview(ctx.me, review)) return { ok: false, message: "You are not the reviewer for this review." };
  if (review.status !== "self_submitted" && review.status !== "manager_reviewed") {
    return { ok: false, message: review.status === "completed" ? "This review is already completed." : "The employee has not submitted their self-appraisal yet." };
  }

  const goals = (await getGoals(employeeId, ctx.cycle.id)).filter((g) => g.status === "approved");
  const fieldErrors: Record<string, string> = {};
  const lines = goals.map((g) => {
    const manager_comment = String(formData.get(`mcomment_${g.id}`) ?? "").trim().slice(0, 4000);
    const manager_rating = rating(formData.get(`mrating_${g.id}`));
    if (intent === "submit") {
      if (manager_comment.length < MIN_COMMENT) fieldErrors[`mcomment_${g.id}`] = `Add your assessment (at least ${MIN_COMMENT} characters)`;
      if (!manager_rating) fieldErrors[`mrating_${g.id}`] = "Choose a rating";
    }
    return { goal_id: g.id, manager_comment: manager_comment || null, manager_rating };
  });
  const overall = rating(formData.get("overall_manager_rating"));
  const summary = String(formData.get("manager_summary") ?? "").trim().slice(0, 4000);
  if (intent === "submit") {
    if (!overall) fieldErrors.overall_manager_rating = "Choose an overall rating";
    if (summary.length < 20) fieldErrors.manager_summary = "Write a summary (at least 20 characters)";
  }
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please complete the highlighted fields before submitting.", fieldErrors };

  // Update only the manager columns of each line, never the employee's self-appraisal.
  for (const line of lines) {
    const { error } = await db()
      .from("goal_ratings")
      .upsert({ review_id: review.id, ...line }, { onConflict: "review_id,goal_id" });
    if (error) return { ok: false, message: `Could not save: ${error.message}` };
  }

  const patch: Record<string, unknown> = { overall_manager_rating: overall, manager_summary: summary || null };
  if (intent === "submit" && review.status === "self_submitted") {
    patch.status = "manager_reviewed";
    patch.reviewed_at = new Date().toISOString();
  }
  const { error } = await db().from("reviews").update(patch).eq("id", review.id).in("status", ["self_submitted", "manager_reviewed"]);
  if (error) return { ok: false, message: `Could not save: ${error.message}` };

  if (intent === "submit") await audit(ctx.me.id, "review.manager_reviewed", "review", review.id, { overall_manager_rating: overall });
  refresh(employeeId);
  return {
    ok: true,
    message: intent === "submit" ? "Review submitted. Discuss it with the employee, then mark it Completed to share it." : "Draft saved.",
  };
}

export async function completeReview(employeeId: string): Promise<ActionState> {
  const ctx = await managerContext(employeeId);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const review = await getReview(employeeId, ctx.cycle.id);
  if (!review || !canReview(ctx.me, review)) return { ok: false, message: "You are not the reviewer for this review." };
  if (review.status !== "manager_reviewed") return { ok: false, message: "Submit your review before completing it." };
  if (!review.overall_manager_rating || !review.manager_summary) return { ok: false, message: "An overall rating and summary are required." };

  const { error } = await db()
    .from("reviews")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", review.id)
    .eq("status", "manager_reviewed");
  if (error) return { ok: false, message: error.message };
  await audit(ctx.me.id, "review.completed", "review", review.id, { overall_manager_rating: review.overall_manager_rating });
  await emailReviewCompleted({ employeeEmail: ctx.employee.email, employeeName: ctx.employee.full_name, cycleName: ctx.cycle.name });
  refresh(employeeId);
  return { ok: true, message: "Review completed and shared with the employee." };
}
