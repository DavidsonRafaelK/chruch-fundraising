import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch (error) {
          /*
           * Usually benign: called from a Server Component, which can't set
           * cookies, and the proxy refreshes the session on every request
           * anyway. Always logged — if it ever fires for another reason,
           * production is exactly where we need to see it.
           */
          console.error(
            "Supabase: failed to set cookie from a Server Component",
            error,
          );
        }
      },
    },
  });
}
