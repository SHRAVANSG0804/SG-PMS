"use client";

import { useState } from "react";
import type { Goal, GoalRating, Review } from "@/lib/types";
import { Card, CardHeader, FieldError } from "@/components/ui";
import { RatingInput } from "@/components/rating-input";
import { FormMessage, SubmitButton, useFormAction } from "@/components/form-bits";
import { cn, formatDate, weightedScore } from "@/lib/utils";
import { saveSelfAppraisal } from "./actions";

export function SelfAppraisalForm({ review, goals, ratings }: { review: Review; goals: Goal[]; ratings: GoalRating[] }) {
  const { state, pending, onSubmit } = useFormAction(saveSelfAppraisal);
  const byGoal = new Map(ratings.map((r) => [r.goal_id, r]));
  const err = state.fieldErrors ?? {};

  // Live weighted score as the employee picks ratings.
  const [picked, setPicked] = useState<Record<string, number>>(() =>
    Object.fromEntries(ratings.filter((r) => r.self_rating).map((r) => [r.goal_id, r.self_rating as number])),
  );
  const score = weightedScore(goals.map((g) => ({ weightage: g.weightage, rating: picked[g.id] })));

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      noValidate
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.type === "radio" && t.name.startsWith("rating_")) setPicked((p) => ({ ...p, [t.name.slice(7)]: Number(t.value) }));
      }}
    >
      <FormMessage state={state} />
      {goals.map((g, i) => {
        const r = byGoal.get(g.id);
        return (
          <Card key={g.id}>
            <CardHeader title={<>Goal {i + 1}: {g.title}</>} description={`Weightage ${g.weightage}% · Target ${formatDate(g.target_date)}`} />
            <div className="grid gap-5 p-5 md:grid-cols-3">
              <div className="md:col-span-2">
                {g.description && <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-line text-slate-600">{g.description}</p>}
                <label htmlFor={`comment_${g.id}`} className="label">What did you achieve? *</label>
                <textarea
                  id={`comment_${g.id}`}
                  name={`comment_${g.id}`}
                  rows={4}
                  defaultValue={r?.self_comment ?? ""}
                  placeholder="Concrete outcomes, numbers, evidence. What went well, what did not?"
                  className={cn("input", err[`comment_${g.id}`] && "input-error")}
                />
                <FieldError message={err[`comment_${g.id}`]} />
              </div>
              <RatingInput name={`rating_${g.id}`} legend="Self-rating *" defaultValue={r?.self_rating} error={err[`rating_${g.id}`]} />
            </div>
          </Card>
        );
      })}

      <Card>
        <CardHeader title="Overall" description={score !== null ? `Weighted score from your goal ratings: ${score} / 5` : "Rate each goal to see your weighted score."} />
        <div className="grid gap-5 p-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <label htmlFor="self_summary" className="label">Summary (optional)</label>
            <textarea id="self_summary" name="self_summary" rows={4} defaultValue={review.self_summary ?? ""} placeholder="Highlights of the year, challenges, support you need, what you want to grow into." className="input" />
          </div>
          <RatingInput name="overall_self_rating" legend="Overall self-rating *" defaultValue={review.overall_self_rating} error={err.overall_self_rating} />
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <SubmitButton pending={pending} name="intent" value="draft" variant="secondary">Save draft</SubmitButton>
        <SubmitButton pending={pending} name="intent" value="submit" pendingText="Submitting…" confirm="Submit your self-appraisal? You will not be able to edit it afterwards, and your manager will be notified.">
          Submit self-appraisal
        </SubmitButton>
        <span className="text-xs text-slate-500">Drafts are private to you.</span>
      </div>
    </form>
  );
}
