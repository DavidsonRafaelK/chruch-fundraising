import type { PostgrestError } from "@supabase/supabase-js";

// Postgres `raise_exception` — the code our own triggers and RPCs produce when
// they raise a message we wrote for end users (e.g. "Invalid status transition
// from completed to pending"). Those are safe to show as-is.
const RAISED_EXCEPTION = "P0001";

/**
 * Turns a PostgrestError into something safe to hand back to the client.
 *
 * A raw `error.message` leaks schema detail — constraint names, column names,
 * function internals — so only messages the database raised on purpose are
 * passed through. Everything else is logged server-side and replaced with the
 * caller's fallback.
 */
export function toUserError(
  context: string,
  error: PostgrestError,
  fallback: string,
): string {
  console.error(`[${context}] ${error.code ?? "unknown"}: ${error.message}`);
  return error.code === RAISED_EXCEPTION ? error.message : fallback;
}
