/**
 * Server Action arguments arrive over the network. The TypeScript signature of
 * an action is a convenience for callers in this codebase, never a runtime
 * guarantee — anything reaching an action must be re-checked here.
 */

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
