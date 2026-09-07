import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";
import type { Database } from "./types";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = supabaseEnv();

  return createServerClient<Database>(url, publishableKey, {
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
           * Usually benign. This is called from a Server Component, which can't
           * set cookies. The proxy refreshes the session on every request anyway.
           * Always logged so if it fires for another reason, we see it in production.
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
