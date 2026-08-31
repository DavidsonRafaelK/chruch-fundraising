import { redirect } from "next/navigation";
import { createClient } from "./server";

/*
 * Authorization boundary for admin-only Server Components, Server Actions,
 * and Route Handlers. proxy.ts only checks that a session exists. This is
 * what actually verifies the caller is an admin. Call it at the top of
 * every admin data-touching entry point, not just once in a layout.
 */
export async function requireAdmin() {
  const supabase = await createClient();

  /*
   * getUser() revalidates against the Supabase auth server.
   * getSession() only reads the local cookie, which could be stale or forged.
   * Never use getSession() for an authorization decision.
   */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/login");
  }

  return user;
}
