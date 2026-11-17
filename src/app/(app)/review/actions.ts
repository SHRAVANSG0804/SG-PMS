"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { ensureReview, getGoals, getOpenCycle } from "@/lib/data";
import { notifyReviewerOfSelfAppraisal } from "@/lib/notify";
import type { ActionState } from "@/lib/types";

const MIN_COMMENT = 10;

function rating(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/**
 * Save (intent=draft) or submit (intent=submit) my self-appraisal.
 * Draft saves whatever is filled in. Submit requires every field, then moves
 * the review Not Started → Self-Appraisal Submitted and e-mails the manager.
 */
export async function saveSelfAppraisal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireEmployee();
  const intent = formData.get("intent") === "submit" ? "submit" : "draft";

  const cycle = await getOpenCycle();
  if (!cycle) return { ok: false, message: "There is no open review cycle." };
  const review = await ensureReview(me, cycle.id);
  if (review.status !== "not_started") return { ok: false, message: "Your self-appraisal has already been submitted." };

  const goals = await getGoals(me.id, cycle.id);
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  if (goals.length === 0 || total !== 100 || goals.some((g) => g.status !== "approved")) {
    return { ok: false, message: "All your goals must be approved (totalling 100) before the self-appraisal." };
  }

  const fieldErrors: Record<string, string> = {};
  const lines = goals.map((g) => {
    const self_comment = String(formData.get(`comment_${g.id}`) ?? "").trim().slice(0, 4000);
    const self_rating = rating(formData.get(`rating_${g.id}`));
    if (intent === "submit") {
      if (self_comment.length < MIN_COMMENT) fieldErrors[`comment_${g.id}`] = `Describe what you achieved (at least ${MIN_COMMENT} characters)`;
      if (!self_rating) fieldErrors[`rating_${g.id}`] = "Choose a rating";
    }
    return { review_id: review.id, goal_id: g.id, self_comment: self_comment || null, self_rating };
  });
  const overall = rating(formData.get("overall_self_rating"));
  const summary = String(formData.get("self_summary") ?? "").trim().slice(0, 4000);
  if (intent === "submit" && !overall) fieldErrors.overall_self_rating = "Choose your overall self-rating";

  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Please complete the highlighted fields before submitting.", fieldErrors };
  }

  const { error: lineErr } = await db().from("goal_ratings").upsert(lines, { onConflict: "review_id,goal_id" });
  if (lineErr) return { ok: false, message: `Could not save: ${lineErr.message}` };

  const patch =
    intent === "submit"
      ? { overall_self_rating: overall, self_summary: summary || null, status: "self_submitted", submitted_at: new Date().toISOString() }
      : { overall_self_rating: overall, self_summary: summary || null };
  // .eq("status","not_started") guards against a double-submit race.
  const { error } = await db().from("reviews").update(patch).eq("id", review.id).eq("status", "not_started");
  if (error) return { ok: false, message: `Could not save: ${error.message}` };

  revalidatePath("/review");
  revalidatePath("/dashboard");

  if (intent === "draft") return { ok: true, message: "Draft saved. Nothing is shared with your manager until you submit." };

  await audit(me.id, "review.self_submitted", "review", review.id, { overall_self_rating: overall });
  // E-mail is a side effect — the submission above is already saved either way.
  const mail = await notifyReviewerOfSelfAppraisal({ ...review, status: "self_submitted" });
  return {
    ok: true,
    message:
      mail.sent > 0
        ? "Self-appraisal submitted. Your manager has been notified by e-mail."
        : "Self-appraisal submitted. (The notification e-mail could not be sent — your submission is safe.)",
  };
}
