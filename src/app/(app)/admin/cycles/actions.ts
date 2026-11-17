"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { audit } from "@/lib/audit";
import { createReviewsForCycle, getCycle, getOpenCycle } from "@/lib/data";
import type { ActionState } from "@/lib/types";

const cycleSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(80),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  })
  .refine((v) => v.end_date > v.start_date, { path: ["end_date"], message: "End date must be after the start date" });

export async function createCycle(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await requireRole("hr_admin");
  const parsed = cycleSchema.safeParse({
    name: formData.get("name") ?? "",
    start_date: formData.get("start_date") ?? "",
    end_date: formData.get("end_date") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] ??= i.message));
    return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };
  }
  const { data, error } = await db()
    .from("review_cycles")
    .insert({ ...parsed.data, status: "draft", created_by: me.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { name: "A cycle with this name already exists" }, message: "Please fix the highlighted fields." };
    return { ok: false, message: `Could not create cycle: ${error.message}` };
  }
  await audit(me.id, "cycle.created", "review_cycle", data.id, parsed.data);
  revalidatePath("/admin/cycles");
  return { ok: true, message: `Created "${parsed.data.name}" as a draft. Open it when you are ready.` };
}

export async function openCycle(cycleId: string): Promise<ActionState> {
  const me = await requireRole("hr_admin");
  const cycle = await getCycle(cycleId);
  if (!cycle) return { ok: false, message: "Cycle not found." };
  if (cycle.status !== "draft") return { ok: false, message: "Only a draft cycle can be opened." };
  const already = await getOpenCycle();
  if (already) return { ok: false, message: `"${already.name}" is already open. Close it first — only one cycle can be open at a time.` };

  const { error } = await db()
    .from("review_cycles")
    .update({ status: "open", opened_at: new Date().toISOString() })
    .eq("id", cycleId)
    .eq("status", "draft");
  // 23505 = unique violation on review_cycles_one_open: the DB enforces the rule even under a race.
  if (error) return { ok: false, message: error.code === "23505" ? "Another cycle is already open." : error.message };

  const count = await createReviewsForCycle(cycleId);
  await audit(me.id, "cycle.opened", "review_cycle", cycleId, { reviews_created: count });
  revalidatePath("/", "layout");
  return { ok: true, message: `"${cycle.name}" is open. ${count} employee reviews were created.` };
}

export async function closeCycle(cycleId: string): Promise<ActionState> {
  const me = await requireRole("hr_admin");
  const cycle = await getCycle(cycleId);
  if (!cycle || cycle.status !== "open") return { ok: false, message: "Only an open cycle can be closed." };
  const { error } = await db()
    .from("review_cycles")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", cycleId);
  if (error) return { ok: false, message: error.message };
  await audit(me.id, "cycle.closed", "review_cycle", cycleId);
  revalidatePath("/", "layout");
  return { ok: true, message: `"${cycle.name}" is closed. Its records are now read-only.` };
}

export async function deleteCycle(cycleId: string): Promise<ActionState> {
  const me = await requireRole("hr_admin");
  const cycle = await getCycle(cycleId);
  if (!cycle || cycle.status !== "draft") return { ok: false, message: "Only draft cycles can be deleted." };
  const { error } = await db().from("review_cycles").delete().eq("id", cycleId).eq("status", "draft");
  if (error) return { ok: false, message: error.message };
  await audit(me.id, "cycle.deleted", "review_cycle", cycleId, { name: cycle.name });
  revalidatePath("/admin/cycles");
  return { ok: true, message: `Deleted draft "${cycle.name}".` };
}
