import "server-only";

import { database } from "./index";

/**
 * Store-wide settings live in `site_settings` so admins can change them
 * without a deploy. Both apps read them, so the queries live here rather than
 * being duplicated per app.
 *
 * Reads never throw: a missing row or an unreachable database must not take
 * the storefront down, so every getter falls back to a sane default.
 */
export const STORE_NAME_KEY = "store.name";
export const STORE_WHATSAPP_KEY = "store.whatsapp";

export const DEFAULT_STORE_NAME = "My Store";

const readSetting = async (key: string): Promise<unknown> => {
  const setting = await database.site_settings
    .findUnique({ where: { key } })
    .catch(() => null);

  return setting?.value ?? null;
};

/** Settings are stored as `{ "value": ... }` or as a bare JSON string. */
const asText = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  const wrapped = (value as { value?: unknown } | null)?.value;

  return typeof wrapped === "string" ? wrapped.trim() || null : null;
};

export const getStoreName = async (): Promise<string> =>
  (await asText(await readSetting(STORE_NAME_KEY))) ?? DEFAULT_STORE_NAME;

/** Indonesian national format, rewritten when an admin types a local number. */
const NATIONAL_PREFIX = "62";

/**
 * wa.me needs digits in international format with no leading +. Admins usually
 * type the local form (0812...), which wa.me silently rejects.
 */
export const normalizeWhatsApp = (value: unknown): string | null => {
  const text =
    typeof value === "string"
      ? value
      : ((value as { number?: unknown } | null)?.number ?? null);

  if (typeof text !== "string") {
    return null;
  }

  let digits = text.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    digits = NATIONAL_PREFIX + digits.slice(1);
  }

  return digits.length >= 8 && digits.length <= 15 ? digits : null;
};

export const getWhatsAppNumber = async (): Promise<string | null> =>
  normalizeWhatsApp(await readSetting(STORE_WHATSAPP_KEY));

export const getRawSetting = async (key: string): Promise<unknown> =>
  readSetting(key);
