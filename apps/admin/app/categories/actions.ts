"use server";

import { toUserError } from "@repo/supabase/error";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation";

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

/*
 * Mirrors the char_length check on categories.name in database/schema.sql.
 */
const MAX_NAME_LENGTH = 100;

export type CategoryInput = {
  name: string;
  hasIngredients: boolean;
};

export type CategoryMutationResult =
  | { success: true; category: { id: string } }
  | { success: false; error: string };

export type DeleteCategoryResult =
  | { success: true }
  | { success: false; error: string };

type ParsedCategoryInput =
  | { ok: true; name: string; hasIngredients: boolean }
  | { ok: false; error: string };

/*
 * Takes unknown on purpose. The CategoryInput annotation on the actions
 * below documents the intended shape but does not enforce it at runtime.
 */
function parseCategoryInput(input: unknown): ParsedCategoryInput {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid category data." };
  }

  const { name, hasIngredients } = input as Record<string, unknown>;

  if (typeof name !== "string") {
    return { ok: false, error: "Category name is required." };
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return { ok: false, error: "Category name is required." };
  }

  if (trimmedName.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Category name is too long (max ${MAX_NAME_LENGTH} characters).`,
    };
  }

  if (typeof hasIngredients !== "boolean") {
    return { ok: false, error: "Invalid category data." };
  }

  return { ok: true, name: trimmedName, hasIngredients };
}

function revalidateCategoryReaders() {
  /*
   * Revalidates every category-reading path this app (apps/admin) owns.
   * The customer app's product listing reads categories from its own Next.js
   * deployment and isn't reachable from here. It picks up the change on its
   * own cache expiry, or needs a separate on-demand revalidation route if that
   * lag becomes a problem later.
   */
  revalidatePath("/categories");
  revalidatePath("/products");
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryMutationResult> {
  await requireAdmin();

  const parsed = parseCategoryInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: parsed.name, has_ingredients: parsed.hasIngredients })
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error: "A category with this name already exists.",
      };
    }
    return {
      success: false,
      error: toUserError(
        "createCategory",
        error,
        "Could not create the category. Try again.",
      ),
    };
  }

  revalidateCategoryReaders();
  return { success: true, category: { id: data.id } };
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CategoryMutationResult> {
  await requireAdmin();

  if (!isUuid(id)) {
    return { success: false, error: "Invalid category." };
  }

  const parsed = parseCategoryInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.name, has_ingredients: parsed.hasIngredients })
    .eq("id", id)
    .select("id")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error: "A category with this name already exists.",
      };
    }
    return {
      success: false,
      error: toUserError(
        "updateCategory",
        error,
        "Could not update the category. Try again.",
      ),
    };
  }

  revalidateCategoryReaders();
  return { success: true, category: { id: data.id } };
}

export async function deleteCategory(
  id: string,
): Promise<DeleteCategoryResult> {
  await requireAdmin();

  if (!isUuid(id)) {
    return { success: false, error: "Invalid category." };
  }

  const supabase = await createClient();

  /*
   * Preemptive check gives a nicer, count-specific message than parsing
   * the FK violation after the fact.
   */
  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return {
      success: false,
      error: toUserError(
        "deleteCategory.count",
        countError,
        "Could not delete the category. Try again.",
      ),
    };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `Can't delete — ${count} product${count === 1 ? "" : "s"} still in this category. Move or disable them first.`,
    };
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) {
    /*
     * Safety net for the unlikely race where a product is added between
     * the count check above and this delete. The FK constraint is the
     * real guard, not the precheck.
     */
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return {
        success: false,
        error:
          "Can't delete — products were just added to this category. Move or disable them first.",
      };
    }
    return {
      success: false,
      error: toUserError(
        "deleteCategory",
        error,
        "Could not delete the category. Try again.",
      ),
    };
  }

  revalidateCategoryReaders();
  return { success: true };
}
