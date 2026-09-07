import { turnstileSecretKey } from "@/lib/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Confirms a Turnstile token with Cloudflare before trusting the request
 * that carried it. Never trust a token's mere presence — a scripted client
 * can send any string in that field.
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp: string | undefined,
): Promise<boolean> {
  const body = new URLSearchParams({
    secret: turnstileSecretKey(),
    response: token,
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    console.error(`[verifyTurnstileToken] siteverify HTTP ${response.status}`);
    return false;
  }

  const result = (await response.json()) as { success: boolean };
  return result.success === true;
}
