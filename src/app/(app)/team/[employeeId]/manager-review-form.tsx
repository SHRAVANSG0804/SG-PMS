"use client";

import { useState } from "react";
import type { Goal, GoalRating, Review } from "@/lib/types";
import { Card, CardHeader, FieldError } from "@/components/ui";
import { RatingInput, RatingPill } from "@/components/rating-input";
import { FormMessage, SubmitButton, useFormAction } from "@/components/form-bits";
import { cn, formatDate, weightedScore } from "@/lib/utils";
import { saveManagerReview } from "../actions";

/** Self-appraisal on the LEFT (read-only), manager input on the RIGHT. */
export function ManagerReviewForm({
  employeeId,
  employeeName,
  review,
  goals,
  ratings,
}: {
  employeeId: string;
  employeeName: string;
  review: Review;
  goals: Goal[];
  ratings: GoalRating[];
}) {
  const { state, pending, onSubmit } = useFormAction(saveManagerReview.bind(null, employeeId));
  const byGoal = new Map(ratings.map((r) => [r.goal_id, r]));
  const err = state.fieldErrors ?? {};
  const first = employeeName.split(" ")[0];

  const [picked, setPicked] = useState<Record<string, number>>(() =>
    Object.fromEntries(ratings.filter((r) => r.manager_rating).map((r) => [r.goal_id, r.manager_rating as number])),
  );
  const score = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: picked[g.id] })));
  const selfScore = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: byGoal.get(g.id)?.self_rating })));

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.type === "radio" && t.name.startsWith("mrating_")) setPicked((p) => ({ ...p, [t.name.slice(8)]: Number(t.value) }));
      }}
    >
      <FormMessage state={state} />
      {goals.map((g, i) => {
        const r = byGoal.get(g.id);
        return (
          <Card key={g.id}>
            <CardHeader title={<>Goal {i + 1}: {g.title}</>} description={`Weightage ${g.weightage}% · Target ${formatDate(g.target_date)}`} />
            <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="space-y-3 bg-slate-50/60 p-5">
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{first}&apos;s self-appraisal</p>
                <p className="text-sm whitespace-pre-line text-slate-700">{r?.self_comment || <span className="text-slate-400">No comment</span>}</p>
                <RatingPill value={r?.self_rating} label="Self-rating" />
              </div>
              <div className="space-y-4 p-5">
                <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">Your assessment</p>
                <div>
                  <label htmlFor={`mcomment_${g.id}`} className="label">Comment *</label>
                  <textarea id={`mcomment_${g.id}`} name={`mcomment_${g.id}`} rows={4} defaultValue={r?.manager_comment ?? ""} placeholder="Evidence-based: what was achieved against the target, and its impact." className={cn("input", err[`mcomment_${g.id}`] && "input-error")} />
                  <FieldError message={err[`mcomment_${g.id}`]} />
                </div>
                <RatingInput name={`mrating_${g.id}`} legend="Your rating *" defaultValue={r?.manager_rating} error={err[`mrating_${g.id}`]} />
              </div>
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader
          title="Overall rating & summary"
          description={`Weighted goal score — yours: ${score ?? "—"} / 5 · ${first}'s self: ${selfScore ?? "—"} / 5. Use it as a guide; the overall rating is your judgement.`}
        />
        <div className="grid divide-y divide-slate-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          <div className="space-y-3 bg-slate-50/60 p-5">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{first}&apos;s overall</p>
            <RatingPill value={review.overall_self_rating} label="Self-rating" />
            {review.self_summary ? <p className="text-sm whitespace-pre-line text-slate-700">{review.self_summary}</p> : <p className="text-sm text-slate-400">No summary</p>}
          </div>
          <div className="space-y-4 p-5">
            <div>
              <label htmlFor="manager_summary" className="label">Summary *</label>
              <textarea id="manager_summary" name="manager_summary" rows={5} defaultValue={review.manager_summary ?? ""} placeholder="Overall performance, key strengths, development areas, and focus for next cycle." className={cn("input", err.manager_summary && "input-error")} />
              <FieldError message={err.manager_summary} />
            </div>
            <RatingInput name="overall_manager_rating" legend="Overall rating *" defaultValue={review.overall_manager_rating} error={err.overall_manager_rating} />
          </div>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <SubmitButton pending={pending} name="intent" value="draft" variant="secondary">Save draft</SubmitButton>
        <SubmitButton pending={pending} name="intent" value="submit" pendingText="Submitting…">
          {review.status === "manager_reviewed" ? "Update review" : "Submit review"}
        </SubmitButton>
        <span className="text-xs text-slate-500">The employee sees your ratings only after you mark the review Completed.</span>
      </div>
    </form>
  );
}
