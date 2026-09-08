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

const productSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  short_description: z
    .string()
    .trim()
    .min(1, "Short description is required")
    .max(300),
  long_description: optionalText(5000),
  ingredients: optionalText(2000),
  category_id: z.string().uuid("Pick a category"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  is_available: z.boolean(),
  image_url: z.string().trim().url("Image URL must be a valid URL"),
  image_url_2: optionalText(2000),
  image_url_3: optionalText(2000),
});

export type ProductInput = z.input<typeof productSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

const revalidate = () => {
  revalidatePath("/products");
  revalidatePath("/");
};

export const createProduct = async (
  input: ProductInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = productSchema.parse(input);

    const product = await database.products.create({ data });

    await recordAudit(actor, "create", "product", product.id, product.title);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const updateProduct = async (
  id: string,
  input: ProductInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = productSchema.parse(input);

    const previous = await database.products.findUnique({
      where: { id },
      select: { image_url: true, image_url_2: true, image_url_3: true },
    });

    const product = await database.products.update({ where: { id }, data });

    // Row is saved first: a failed cleanup leaves an orphan, not a broken edit.
    await deleteRemovedImages(
      [previous?.image_url, previous?.image_url_2, previous?.image_url_3],
      [product.image_url, product.image_url_2, product.image_url_3]
    );
    await recordAudit(actor, "update", "product", product.id, product.title);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const deleteProduct = async (id: string): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const product = await database.products.delete({ where: { id } });

    await deleteRemovedImages(
      [product.image_url, product.image_url_2, product.image_url_3],
      []
    );
    await recordAudit(actor, "delete", "product", product.id, product.title);
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
