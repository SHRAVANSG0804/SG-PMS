"use client";

import { useEffect, useRef } from "react";
import { FieldError } from "@/components/ui";
import { FormMessage, SubmitButton, useFormAction } from "@/components/form-bits";
import { cn } from "@/lib/utils";
import { createCycle } from "./actions";

export function CycleForm() {
  const { state, pending, onSubmit } = useFormAction(createCycle);
  const formRef = useRef<HTMLFormElement>(null);
  const err = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div>
        <label htmlFor="name" className="label">Cycle name *</label>
        <input id="name" name="name" placeholder="FY 2026–27 Annual" className={cn("input", err.name && "input-error")} />
        <FieldError message={err.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_date" className="label">Start date *</label>
          <input id="start_date" name="start_date" type="date" className={cn("input", err.start_date && "input-error")} />
          <FieldError message={err.start_date} />
        </div>
        <div>
          <label htmlFor="end_date" className="label">End date *</label>
          <input id="end_date" name="end_date" type="date" className={cn("input", err.end_date && "input-error")} />
          <FieldError message={err.end_date} />
        </div>
      </div>
      <SubmitButton pending={pending} pendingText="Creating…">Create as draft</SubmitButton>
    </form>
  );
}
