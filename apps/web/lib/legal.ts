import "server-only";

import { database } from "@repo/database";

/**
 * Legal pages live in `site_settings` under `legal.<slug>` so the admin can
 * edit them without a deploy. `apps/app` points Clerk at /legal/privacy and
 * /legal/terms, so those two slugs are always offered even before anyone has
 * written them.
 */
export const LEGAL_SLUGS = ["privacy", "terms"] as const;

export interface LegalDocument {
  slug: string;
  title: string;
  description: string;
  body: string;
}

const FALLBACK_TITLE: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const getLegalDocument = async (
  slug: string
): Promise<LegalDocument | null> => {
  const setting = await database.site_settings
    .findUnique({ where: { key: `legal.${slug}` } })
    .catch(() => null);

  if (!setting) {
    if (!LEGAL_SLUGS.includes(slug as (typeof LEGAL_SLUGS)[number])) {
      return null;
    }

    return {
      slug,
      title: FALLBACK_TITLE[slug] ?? slug,
      description: "",
      body: "This page has not been written yet.",
    };
  }

  const value = setting.value as Record<string, unknown> | null;

  return {
    slug,
    title: asString(value?.title) || FALLBACK_TITLE[slug] || slug,
    description: asString(value?.description),
    body: asString(value?.body),
  };
};

export const getLegalDocuments = async (): Promise<LegalDocument[]> => {
  const settings = await database.site_settings
    .findMany({ where: { key: { startsWith: "legal." } } })
    .catch(() => []);

  const slugs = new Set<string>(LEGAL_SLUGS);

  for (const setting of settings) {
    slugs.add(setting.key.replace("legal.", ""));
  }

  const documents = await Promise.all(
    [...slugs].map((slug) => getLegalDocument(slug))
  );

  return documents.filter((document) => document !== null);
};
