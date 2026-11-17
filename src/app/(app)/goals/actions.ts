"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireEmployee } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { emailGoalsSubmitted } from "@/lib/email";
import { getEmployee, getGoals, getOpenCycle, getReview } from "@/lib/data";
import type { ActionState, Goal } from "@/lib/types";

const MAX_GOALS = 10;
const EDITABLE: Goal["status"][] = ["draft", "sent_back"];

const goalSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Keep the title under 150 characters"),
  description: z.string().trim().max(2000, "Keep the description under 2000 characters"),
  weightage: z.coerce
    .number({ invalid_type_error: "Weightage must be a number" })
    .int("Use a whole number")
    .min(1, "Weightage must be at least 1")
    .max(100, "Weightage cannot exceed 100"),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Target date is required"),
});

/** Shared guard: there is an open cycle and my review has not started yet. */
async function editableContext(employeeId: string) {
  const cycle = await getOpenCycle();
  if (!cycle) return { error: "There is no open review cycle." as const };
  const review = await getReview(employeeId, cycle.id);
  if (review && review.status !== "not_started") return { error: "Your self-appraisal is already submitted, so goals are locked." as const };
  return { cycle };
}

export async function saveGoal(goalId: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireEmployee();
  const ctx = await editableContext(me.id);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const { cycle } = ctx;

  const parsed = goalSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    weightage: formData.get("weightage") || undefined,
    target_date: formData.get("target_date") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] ??= i.message));
    if (formData.get("weightage") === "" || formData.get("weightage") === null) fieldErrors.weightage = "Weightage is required";
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;
  if (input.target_date < cycle.start_date || input.target_date > cycle.end_date) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: { target_date: `Pick a date inside the cycle (${cycle.start_date} to ${cycle.end_date})` } };
  }

  const goals = await getGoals(me.id, cycle.id);
  const existing = goalId ? goals.find((g) => g.id === goalId) : null;
  // Ownership check: the goal must be MINE and in THIS cycle — never trust the id from the form.
  if (goalId && !existing) return { ok: false, message: "Goal not found." };
  if (existing && !EDITABLE.includes(existing.status)) return { ok: false, message: "Only draft or sent-back goals can be edited." };
  if (!existing && goals.length >= MAX_GOALS) return { ok: false, message: `You can have at most ${MAX_GOALS} goals in a cycle.` };

  const otherTotal = goals.filter((g) => g.id !== goalId).reduce((s, g) => s + g.weightage, 0);
  if (otherTotal + input.weightage > 100) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors: { weightage: `Total would be ${otherTotal + input.weightage}. You have ${100 - otherTotal} left to allocate.` },
    };
  }

  if (existing) {
    const { error } = await db().from("goals").update(input).eq("id", existing.id).eq("employee_id", me.id);
    if (error) return { ok: false, message: error.message };
    await audit(me.id, "goal.updated", "goal", existing.id, { title: input.title, weightage: input.weightage });
  } else {
    const { data, error } = await db()
      .from("goals")
      .insert({ ...input, employee_id: me.id, cycle_id: cycle.id, status: "draft" })
      .select("id")
      .single();
    if (error) return { ok: false, message: error.message };
    await audit(me.id, "goal.created", "goal", data.id, { title: input.title, weightage: input.weightage });
  }
  revalidatePath("/goals");
  redirect("/goals");
}

export async function deleteGoal(goalId: string): Promise<ActionState> {
  const me = await requireEmployee();
  const ctx = await editableContext(me.id);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const goal = (await getGoals(me.id, ctx.cycle.id)).find((g) => g.id === goalId);
  if (!goal) return { ok: false, message: "Goal not found." };
  if (!EDITABLE.includes(goal.status)) return { ok: false, message: "Approved or pending goals cannot be deleted." };
  const { error } = await db().from("goals").delete().eq("id", goalId).eq("employee_id", me.id);
  if (error) return { ok: false, message: error.message };
  await audit(me.id, "goal.deleted", "goal", goalId, { title: goal.title });
  revalidatePath("/goals");
  return { ok: true, message: "Goal deleted." };
}

export async function submitGoals(): Promise<ActionState> {
  const me = await requireEmployee();
  const ctx = await editableContext(me.id);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  const { cycle } = ctx;

  const goals = await getGoals(me.id, cycle.id);
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  if (goals.length === 0) return { ok: false, message: "Add at least one goal before submitting." };
  if (total !== 100) return { ok: false, message: `Weightages must total exactly 100 before you submit. They currently total ${total}.` };
  const toSubmit = goals.filter((g) => EDITABLE.includes(g.status));
  if (toSubmit.length === 0) return { ok: false, message: "Nothing to submit — all goals are already pending or approved." };

  const { error } = await db()
    .from("goals")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .in("id", toSubmit.map((g) => g.id))
    .eq("employee_id", me.id);
  if (error) return { ok: false, message: error.message };
  await audit(me.id, "goals.submitted", "employee", me.id, { cycle_id: cycle.id, goal_ids: toSubmit.map((g) => g.id) });

  // Side effect only: e-mail failure never undoes the submission.
  if (me.manager_id) {
    const manager = await getEmployee(me.manager_id);
    if (manager) {
      await emailGoalsSubmitted({
        managerEmail: manager.email,
        managerName: manager.full_name,
        employeeName: me.full_name,
        cycleName: cycle.name,
        employeeId: me.id,
        count: toSubmit.length,
      });
    }
  }
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { ok: true, message: `${toSubmit.length} goal${toSubmit.length === 1 ? "" : "s"} sent to your manager for approval.` };
}
