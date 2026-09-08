"use server";

import { requireAdmin } from "@repo/auth/roles";
import { database } from "@repo/database";
import { normalizeWhatsApp } from "@repo/database/settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "./audit";

const settingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100),
  whatsapp: z.string().trim().max(30),
  legal: z.array(
    z.object({
      slug: z.string().trim().min(1).max(50),
      title: z.string().trim().max(200),
      description: z.string().trim().max(500),
      body: z.string().trim().max(20_000),
    })
  ),
});

export type SettingsInput = z.input<typeof settingsSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Writes every setting in one transaction so a partial save cannot leave the
 * storefront half-updated.
 */
export const updateSiteSettings = async (
  input: SettingsInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = settingsSchema.parse(input);

    if (data.whatsapp !== "" && !normalizeWhatsApp(data.whatsapp)) {
      return {
        ok: false,
        error: "That WhatsApp number does not look like a phone number",
      };
    }

    const rows = [
      { key: "store.name", value: { value: data.storeName } },
      // Stored as typed; normalised when the storefront builds the wa.me link.
      { key: "store.whatsapp", value: { number: data.whatsapp } },
      ...data.legal.map((page) => ({
        key: `legal.${page.slug}`,
        value: {
          title: page.title,
          description: page.description,
          body: page.body,
        },
      })),
    ];

    await database.$transaction(
      rows.map((row) =>
        database.site_settings.upsert({
          where: { key: row.key },
          create: { key: row.key, value: row.value, updated_by: actor.id },
          update: { value: row.value, updated_by: actor.id },
        })
      )
    );

    await recordAudit(
      actor,
      "update",
      "settings",
      "site",
      `Updated store settings (${rows.length} entries)`
    );

    revalidatePath("/settings");

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

const toMessage = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.issues.at(0)?.message ?? "Invalid input";
  }

  return error instanceof Error ? error.message : "Something went wrong";
};
