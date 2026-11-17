"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { getAllEmployees, getOpenCycle, ensureReview } from "@/lib/data";
import type { ActionState, Employee } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

const employeeSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid e-mail address"),
  designation: z.string().trim().min(2, "Designation is required").max(80),
  department: z.string().trim().min(2, "Department is required").max(80),
  date_of_joining: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of joining is required")
    .refine((d) => d <= today(), "Date of joining cannot be in the future"),
  manager_id: z
    .string()
    .uuid()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  role: z.enum(["employee", "manager", "hr_admin"], { message: "Choose a role" }),
  is_active: z.boolean(),
});

function parse(formData: FormData) {
  return employeeSchema.safeParse({
    full_name: formData.get("full_name") ?? "",
    email: formData.get("email") ?? "",
    designation: formData.get("designation") ?? "",
    department: formData.get("department") ?? "",
    date_of_joining: formData.get("date_of_joining") ?? "",
    manager_id: formData.get("manager_id") ?? "",
    role: formData.get("role") ?? "",
    is_active: formData.get("is_active") === "on",
  });
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

/** Walk up the chain from the proposed manager; reaching `employeeId` means a loop (A→B→A). */
function createsLoop(all: Employee[], employeeId: string, managerId: string | null): boolean {
  const byId = new Map(all.map((e) => [e.id, e]));
  let cursor = managerId;
  for (let hops = 0; cursor && hops < 1000; hops++) {
    if (cursor === employeeId) return true;
    cursor = byId.get(cursor)?.manager_id ?? null;
  }
  return false;
}

export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("hr_admin");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const all = await getAllEmployees();
  if (all.some((e) => e.email === input.email)) {
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: { email: "An employee with this e-mail already exists" } };
  }
  if (input.manager_id && !all.find((e) => e.id === input.manager_id && e.is_active)) {
    return { ok: false, fieldErrors: { manager_id: "Choose an active employee as manager" }, message: "Please fix the highlighted fields." };
  }

  const { data, error } = await db().from("employees").insert(input).select("*").single();
  if (error) return { ok: false, message: `Could not save: ${error.message}` };
  const created = data as Employee;

  // Joining mid-cycle? They still need a review row for the open cycle.
  const open = await getOpenCycle();
  if (open && created.is_active) await ensureReview(created, open.id);

  await audit(me.id, "employee.created", "employee", created.id, { email: created.email, role: created.role });
  revalidatePath("/admin/employees");
  redirect(`/admin/employees?saved=${encodeURIComponent(created.full_name)}`);
}

export async function updateEmployee(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("hr_admin");
  const parsed = parse(formData);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const all = await getAllEmployees();
  const current = all.find((e) => e.id === id);
  if (!current) return { ok: false, message: "Employee not found." };

  const errors: Record<string, string> = {};
  if (all.some((e) => e.email === input.email && e.id !== id)) errors.email = "Another employee already uses this e-mail";
  if (input.manager_id === id) errors.manager_id = "An employee cannot be their own manager";
  else if (input.manager_id && !all.find((e) => e.id === input.manager_id && e.is_active)) errors.manager_id = "Choose an active employee as manager";
  else if (createsLoop(all, id, input.manager_id)) errors.manager_id = "That would create a reporting loop (this person is above the chosen manager)";
  if (id === me.id && input.role !== "hr_admin") errors.role = "You cannot remove your own HR Admin role";
  if (id === me.id && !input.is_active) errors.is_active = "You cannot deactivate yourself";
  if (Object.keys(errors).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors: errors };

  // Changing the e-mail un-links the old Clerk account so the new address can sign in.
  const patch = { ...input, ...(input.email !== current.email ? { clerk_user_id: null } : {}) };
  const { error } = await db().from("employees").update(patch).eq("id", id);
  if (error) return { ok: false, message: `Could not save: ${error.message}` };

  const open = await getOpenCycle();
  if (open) {
    if (input.manager_id !== current.manager_id) {
      // Reassigned mid-cycle: the NEW manager reviews any not-yet-completed review.
      await db().from("reviews").update({ manager_id: input.manager_id }).eq("employee_id", id).eq("cycle_id", open.id).neq("status", "completed");
    }
    if (input.is_active) await ensureReview({ ...current, ...input }, open.id);
  }

  const changed = (Object.keys(input) as (keyof typeof input)[]).filter((k) => input[k] !== current[k]);
  await audit(me.id, "employee.updated", "employee", id, { changed });
  revalidatePath("/admin/employees");
  redirect(`/admin/employees?saved=${encodeURIComponent(input.full_name)}`);
}
