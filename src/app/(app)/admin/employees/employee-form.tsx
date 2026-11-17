"use client";

import Link from "next/link";
import { DEPARTMENTS } from "@/lib/constants";
import type { ActionState, Employee } from "@/lib/types";
import { FieldError } from "@/components/ui";
import { FormMessage, SubmitButton, useFormAction } from "@/components/form-bits";
import { cn } from "@/lib/utils";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function EmployeeForm({
  action,
  employee,
  managers,
}: {
  action: Action;
  employee?: Employee;
  managers: Pick<Employee, "id" | "full_name" | "designation">[];
}) {
  const { state, pending, onSubmit } = useFormAction(action);
  const err = state.fieldErrors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="full_name" className="label">Full name *</label>
          <input id="full_name" name="full_name" required defaultValue={employee?.full_name} className={cn("input", err.full_name && "input-error")} />
          <FieldError message={err.full_name} />
        </div>
        <div>
          <label htmlFor="email" className="label">Work e-mail *</label>
          <input id="email" name="email" type="email" required defaultValue={employee?.email} className={cn("input", err.email && "input-error")} />
          <p className="mt-1 text-xs text-slate-500">They must sign in with this exact address.</p>
          <FieldError message={err.email} />
        </div>
        <div>
          <label htmlFor="designation" className="label">Designation *</label>
          <input id="designation" name="designation" required placeholder="e.g. Software Engineer" defaultValue={employee?.designation} className={cn("input", err.designation && "input-error")} />
          <FieldError message={err.designation} />
        </div>
        <div>
          <label htmlFor="department" className="label">Department *</label>
          <input id="department" name="department" list="departments" required defaultValue={employee?.department} className={cn("input", err.department && "input-error")} />
          <datalist id="departments">
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
          <FieldError message={err.department} />
        </div>
        <div>
          <label htmlFor="date_of_joining" className="label">Date of joining *</label>
          <input id="date_of_joining" name="date_of_joining" type="date" max={today} required defaultValue={employee?.date_of_joining?.slice(0, 10)} className={cn("input", err.date_of_joining && "input-error")} />
          <FieldError message={err.date_of_joining} />
        </div>
        <div>
          <label htmlFor="manager_id" className="label">Reports to</label>
          <select id="manager_id" name="manager_id" defaultValue={employee?.manager_id ?? ""} className={cn("input", err.manager_id && "input-error")}>
            <option value="">— No manager (top of hierarchy) —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name} · {m.designation}
              </option>
            ))}
          </select>
          <FieldError message={err.manager_id} />
        </div>
        <div>
          <label htmlFor="role" className="label">Role *</label>
          <select id="role" name="role" defaultValue={employee?.role ?? "employee"} className={cn("input", err.role && "input-error")}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="hr_admin">HR Admin</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">Anyone with direct reports automatically gets the My Team view.</p>
          <FieldError message={err.role} />
        </div>
        <div className="flex items-start gap-3 pt-7">
          <input id="is_active" name="is_active" type="checkbox" defaultChecked={employee?.is_active ?? true} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600" />
          <div>
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active</label>
            <p className="text-xs text-slate-500">Inactive employees cannot sign in. Their history is kept.</p>
            <FieldError message={err.is_active} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <SubmitButton pending={pending}>{employee ? "Save changes" : "Add employee"}</SubmitButton>
        <Link href="/admin/employees" className="btn btn-secondary">Cancel</Link>
      </div>
    </form>
  );
}
