"use server";

import { requireAdmin } from "@repo/auth/roles";
import { database } from "@repo/database";
import { deleteRemovedImages } from "@repo/storage";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "./audit";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable();

const bannerSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    subtitle: optionalText(500),
    image_url: z.string().trim().url("Image URL must be a valid URL").max(2000),
    link_url: optionalText(2000),
    link_label: optionalText(100),
    sort_order: z.coerce.number().int().min(0),
    is_active: z.boolean(),
    starts_at: z.coerce.date().nullable(),
    ends_at: z.coerce.date().nullable(),
  })
  .refine(
    (value) =>
      !(value.starts_at && value.ends_at) || value.ends_at > value.starts_at,
    { message: "End date must be after start date", path: ["ends_at"] }
  );

export type BannerInput = z.input<typeof bannerSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

const revalidate = () => {
  revalidatePath("/banners");
};

export const createBanner = async (
  input: BannerInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = bannerSchema.parse(input);

    const banner = await database.banners.create({ data });

    await recordAudit(actor, "create", "banner", banner.id, banner.title);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const updateBanner = async (
  id: string,
  input: BannerInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = bannerSchema.parse(input);

    const previous = await database.banners.findUnique({
      where: { id },
      select: { image_url: true },
    });

    const banner = await database.banners.update({ where: { id }, data });

    // Row is saved first: a failed cleanup leaves an orphan, not a broken edit.
    await deleteRemovedImages([previous?.image_url], [banner.image_url]);
    await recordAudit(actor, "update", "banner", banner.id, banner.title);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const deleteBanner = async (id: string): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const banner = await database.banners.delete({ where: { id } });

    await deleteRemovedImages([banner.image_url], []);
    await recordAudit(actor, "delete", "banner", banner.id, banner.title);
    revalidate();

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
