"use client";

import { useState } from "react";
import { FieldError } from "@/components/ui";
import { SubmitButton, useFormAction } from "@/components/form-bits";
import { cn } from "@/lib/utils";
import { sendBackGoal } from "../actions";

export function SendBackForm({ employeeId, goalId }: { employeeId: string; goalId: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, onSubmit } = useFormAction(sendBackGoal.bind(null, employeeId, goalId));
  if (!open) {
    return (
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        Send back
      </button>
    );
  }
  return (
    <form onSubmit={onSubmit} className="w-full space-y-2" noValidate>
      <label htmlFor={`comment-${goalId}`} className="label">What should change? *</label>
      <textarea id={`comment-${goalId}`} name="comment" rows={3} autoFocus placeholder="e.g. Make this measurable — what number tells us it is done?" className={cn("input", state.fieldErrors?.comment && "input-error")} />
      <FieldError message={state.fieldErrors?.comment} />
      {!state.ok && state.message && !state.fieldErrors && <p className="text-xs text-red-600">{state.message}</p>}
      <div className="flex gap-2">
        <SubmitButton pending={pending} variant="danger" size="sm" pendingText="Sending…">Send back with comment</SubmitButton>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
