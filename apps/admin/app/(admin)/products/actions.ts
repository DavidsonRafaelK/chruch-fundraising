"use server";

import { toUserError } from "@repo/supabase/error";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation";

const BUCKET = "product-images";

/*
 * Mirror the checks on public.products in database/schema.sql and the
 * limits on the product-images bucket. The database is still the real
 * guard — these exist so an admin gets a useful message instead of a
 * constraint violation.
 */
const MAX_TITLE_LENGTH = 200;
const MAX_SHORT_DESCRIPTION_LENGTH = 300;
const MAX_LONG_DESCRIPTION_LENGTH = 5000;
const MAX_INGREDIENTS_LENGTH = 2000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export type ProductInput = {
  title: string;
  shortDescription: string;
  longDescription: string | null;
  ingredients: string | null;
  categoryId: string;
  price: number;
  isAvailable: boolean;
  imageUrl: string;
  imageUrl2: string | null;
  imageUrl3: string | null;
};

export type ProductMutationResult =
  | { success: true; product: { id: string } }
  | { success: false; error: string };

export type UploadImageResult =
  | { success: true; url: string }
  | { success: false; error: string };

type ParsedProductInput =
  | { ok: true; value: ProductInput }
  | { ok: false; error: string };

/*
 * Takes unknown on purpose. The ProductInput annotation documents the shape
 * the form sends; it is not a runtime guarantee for anything arriving over
 * the network.
 */
function parseProductInput(input: unknown): ParsedProductInput {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid product data." };
  }

  const raw = input as Record<string, unknown>;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) {
    return { ok: false, error: "Title is required." };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return {
      ok: false,
      error: `Title is too long (max ${MAX_TITLE_LENGTH} characters).`,
    };
  }

  const shortDescription =
    typeof raw.shortDescription === "string" ? raw.shortDescription.trim() : "";
  if (!shortDescription) {
    return { ok: false, error: "Short description is required." };
  }
  if (shortDescription.length > MAX_SHORT_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Short description is too long (max ${MAX_SHORT_DESCRIPTION_LENGTH} characters).`,
    };
  }

  const longDescriptionRaw =
    typeof raw.longDescription === "string" ? raw.longDescription.trim() : "";
  if (longDescriptionRaw.length > MAX_LONG_DESCRIPTION_LENGTH) {
    return {
      ok: false,
      error: `Description is too long (max ${MAX_LONG_DESCRIPTION_LENGTH} characters).`,
    };
  }
  const longDescription = longDescriptionRaw || null;

  const ingredientsRaw =
    typeof raw.ingredients === "string" ? raw.ingredients.trim() : "";
  if (ingredientsRaw.length > MAX_INGREDIENTS_LENGTH) {
    return {
      ok: false,
      error: `Ingredients are too long (max ${MAX_INGREDIENTS_LENGTH} characters).`,
    };
  }

  const categoryId = typeof raw.categoryId === "string" ? raw.categoryId : "";
  if (!isUuid(categoryId)) {
    return { ok: false, error: "Choose a category." };
  }

  const price = typeof raw.price === "number" ? raw.price : Number.NaN;
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Enter a price of zero or more." };
  }

  const imageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";
  if (!imageUrl) {
    return { ok: false, error: "A cover photo is required." };
  }

  const optionalImage = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  return {
    ok: true,
    value: {
      title,
      shortDescription,
      longDescription,
      ingredients: ingredientsRaw || null,
      categoryId,
      price: Math.round(price * 100) / 100,
      isAvailable: raw.isAvailable !== false,
      imageUrl,
      imageUrl2: optionalImage(raw.imageUrl2),
      imageUrl3: optionalImage(raw.imageUrl3),
    },
  };
}

/*
 * Public bucket URLs look like
 * <project>/storage/v1/object/public/product-images/<path>. Anything that
 * doesn't match — a seeded "/dummy/x.png" path, an external URL — has no
 * object behind it and must not be handed to storage.remove().
 */
function storagePathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function uploadProductImage(
  formData: FormData,
): Promise<UploadImageResult> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose an image to upload." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { success: false, error: "Image is larger than 5 MB." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { success: false, error: "Use a JPEG, PNG, WebP, or AVIF image." };
  }

  const supabase = await createClient();
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error(`[uploadProductImage] ${error.message}`);
    return { success: false, error: "Could not upload the image. Try again." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { success: true, url: publicUrl };
}

function toRow(input: ProductInput) {
  return {
    title: input.title,
    short_description: input.shortDescription,
    long_description: input.longDescription,
    ingredients: input.ingredients,
    category_id: input.categoryId,
    price: input.price,
    is_available: input.isAvailable,
    image_url: input.imageUrl,
    image_url_2: input.imageUrl2,
    image_url_3: input.imageUrl3,
  };
}

export async function createProduct(
  input: ProductInput,
): Promise<ProductMutationResult> {
  await requireAdmin();

  const parsed = parseProductInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(toRow(parsed.value))
    .select("id")
    .single();

  if (error) {
    return {
      success: false,
      error: toUserError(
        "createProduct",
        error,
        "Could not create the product. Try again.",
      ),
    };
  }

  revalidatePath("/products");
  return { success: true, product: { id: data.id } };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ProductMutationResult> {
  await requireAdmin();

  if (!isUuid(id)) {
    return { success: false, error: "Invalid product." };
  }

  const parsed = parseProductInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("products")
    .select("image_url, image_url_2, image_url_3")
    .eq("id", id)
    .single();

  if (readError) {
    return {
      success: false,
      error: toUserError(
        "updateProduct.read",
        readError,
        "Could not load the product. Try again.",
      ),
    };
  }

  const { error } = await supabase
    .from("products")
    .update(toRow(parsed.value))
    .eq("id", id);

  if (error) {
    return {
      success: false,
      error: toUserError(
        "updateProduct",
        error,
        "Could not save the product. Try again.",
      ),
    };
  }

  await removeOrphanedImages(
    supabase,
    [current.image_url, current.image_url_2, current.image_url_3],
    [parsed.value.imageUrl, parsed.value.imageUrl2, parsed.value.imageUrl3],
  );

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);

  return { success: true, product: { id } };
}

/*
 * Deletes bucket objects the product no longer points at. Runs after the row
 * is saved, so a failed update never destroys an image that is still in use.
 * A failure here only leaves an unreferenced file behind, which is why it
 * does not turn the save into an error.
 */
async function removeOrphanedImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  before: (string | null)[],
  after: (string | null)[],
) {
  const kept = new Set(after.filter((url): url is string => Boolean(url)));
  const removed = before
    .filter((url): url is string => Boolean(url) && !kept.has(url as string))
    .map(storagePathFromUrl)
    .filter((path): path is string => path !== null);

  if (removed.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(BUCKET).remove(removed);
  if (error) {
    console.error(`[removeOrphanedImages] ${error.message}`);
  }
}

export type DeleteProductResult =
  | { success: true }
  | { success: false; error: string };

/*
 * Past orders survive this: order_items keeps its own name and price
 * snapshots, and its product_id is ON DELETE SET NULL. Deleting a product
 * therefore rewrites no order history. Hiding a product (is_available =
 * false) is still the safer everyday choice, since delete also destroys its
 * photos.
 */
export async function deleteProduct(id: string): Promise<DeleteProductResult> {
  await requireAdmin();

  if (!isUuid(id)) {
    return { success: false, error: "Invalid product." };
  }

  const supabase = await createClient();

  const { data: current, error: readError } = await supabase
    .from("products")
    .select("image_url, image_url_2, image_url_3")
    .eq("id", id)
    .single();

  if (readError) {
    return {
      success: false,
      error: toUserError(
        "deleteProduct.read",
        readError,
        "Could not delete the product. Try again.",
      ),
    };
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    return {
      success: false,
      error: toUserError(
        "deleteProduct",
        error,
        "Could not delete the product. Try again.",
      ),
    };
  }

  await removeOrphanedImages(
    supabase,
    [current.image_url, current.image_url_2, current.image_url_3],
    [],
  );

  revalidatePath("/products");
  return { success: true };
}
