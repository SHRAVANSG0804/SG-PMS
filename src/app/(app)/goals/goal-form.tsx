"use client";

import Link from "next/link";
import { useState } from "react";
import type { Goal } from "@/lib/types";
import { FieldError } from "@/components/ui";
import { FormMessage, SubmitButton, useFormAction } from "@/components/form-bits";
import { cn } from "@/lib/utils";
import { saveGoal } from "./actions";

export function GoalForm({
  goal,
  remaining,
  minDate,
  maxDate,
}: {
  goal?: Goal;
  /** Weightage still unallocated, NOT counting this goal. */
  remaining: number;
  minDate: string;
  maxDate: string;
}) {
  const { state, pending, onSubmit } = useFormAction(saveGoal.bind(null, goal?.id ?? null));
  const [weight, setWeight] = useState<string>(goal ? String(goal.weightage) : "");
  const err = state.fieldErrors ?? {};
  const after = remaining - (Number(weight) || 0);

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="title" className="label">Goal title *</label>
        <input id="title" name="title" defaultValue={goal?.title} placeholder="e.g. Reduce P1 bug turnaround to under 48 hours" className={cn("input", err.title && "input-error")} />
        <FieldError message={err.title} />
      </div>
      <div>
        <label htmlFor="description" className="label">Description &amp; success measure</label>
        <textarea id="description" name="description" rows={3} defaultValue={goal?.description} placeholder="What does success look like? How will it be measured? (Specific · Measurable · Achievable · Relevant · Time-bound)" className={cn("input", err.description && "input-error")} />
        <FieldError message={err.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="weightage" className="label">Weightage (%) *</label>
          <input
            id="weightage"
            name="weightage"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            step={1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={cn("input", (err.weightage || after < 0) && "input-error")}
          />
          <p className={cn("mt-1 text-xs", after < 0 ? "font-medium text-red-600" : "text-slate-500")}>
            {after < 0 ? `Over by ${-after}. Only ${remaining} left to allocate.` : `${after} left to allocate after this goal.`}
          </p>
          <FieldError message={err.weightage} />
        </div>
        <div>
          <label htmlFor="target_date" className="label">Target date *</label>
          <input id="target_date" name="target_date" type="date" min={minDate} max={maxDate} defaultValue={goal?.target_date?.slice(0, 10)} className={cn("input", err.target_date && "input-error")} />
          <FieldError message={err.target_date} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending}>{goal ? "Save goal" : "Add goal"}</SubmitButton>
        {goal && <Link href="/goals" className="btn btn-secondary">Cancel</Link>}
      </div>
    </form>
  );
}
