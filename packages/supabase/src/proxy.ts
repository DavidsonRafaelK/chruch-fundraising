import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let proxyResponse = NextResponse.next({ request });
  const { url, publishableKey } = supabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        proxyResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          proxyResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not run code between createServerClient and getUser(): a dropped
  // call here can silently desync the session cookie from Supabase auth.
  await supabase.auth.getUser();

  return proxyResponse;
}
