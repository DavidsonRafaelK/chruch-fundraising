import { updateSession } from "@repo/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/login";

// This app is a standalone deployment (no shared domain with the customer
// app), so admin routes live at the root, not under an "/admin" prefix.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Session-exists check only — role/admin verification happens in
  // requireAdmin() on every admin Server Component/Action/Route Handler.
  // This layer is just the UX shortcut that avoids flashing a page before
  // redirecting; it must never be relied on as the sole auth boundary.
  if (!user && pathname !== LOGIN_PATH) {
    return redirectPreservingSession(request, response, LOGIN_PATH);
  }

  if (user && pathname === LOGIN_PATH) {
    return redirectPreservingSession(request, response, "/");
  }

  return response;
}

function redirectPreservingSession(
  request: NextRequest,
  sessionResponse: NextResponse,
  path: string,
) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  // Carry over any refreshed auth cookies from updateSession() so the
  // redirected request isn't left with a stale/soon-to-expire session.
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
