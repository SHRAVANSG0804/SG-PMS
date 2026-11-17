import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the SERVICE ROLE key.
 *
 * - `import "server-only"` makes the build FAIL if any client component ever
 *   imports this file, so the secret key can never reach the browser.
 * - The service role bypasses Row Level Security. That is deliberate: RLS is
 *   ON with no public policies (see supabase/schema.sql), so the anon key can
 *   read nothing, and every query in this app runs on the server AFTER
 *   `src/lib/auth.ts` has worked out who the user is and what they may see.
 */
let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (and in Vercel).",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Throw a readable error when Supabase returns one, instead of silently using `null`. */
export function must<T>(result: { data: T | null; error: { message: string } | null }, context: string): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data as T;
}
