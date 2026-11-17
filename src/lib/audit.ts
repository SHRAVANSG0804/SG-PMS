import "server-only";
import { db } from "./supabase";

/**
 * Append-only audit trail ("who did what, when"). Failures are logged, never
 * thrown: an audit hiccup must not undo the user's real action.
 */
export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await db()
    .from("audit_log")
    .insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, details });
  if (error) console.error("[audit] failed to record", action, error.message);
}
