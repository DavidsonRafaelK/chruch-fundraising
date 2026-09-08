import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * A From header may be a bare address or a display name with the address in
 * angle brackets ("Store <noreply@example.com>"), which is what Resend shows
 * in its dashboard. Validate the address part either way.
 */
const emailAddress = z.string().refine((value) => {
  const match = value.match(/<([^>]+)>\s*$/);
  const address = match ? match[1].trim() : value.trim();

  return z.email().safeParse(address).success;
}, 'Must be an email address, optionally as "Name <email@example.com>"');

export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      RESEND_FROM: emailAddress.optional(),
      RESEND_TOKEN: z.string().startsWith("re_").optional(),
    },
    runtimeEnv: {
      RESEND_FROM: process.env.RESEND_FROM,
      RESEND_TOKEN: process.env.RESEND_TOKEN,
    },
  });
