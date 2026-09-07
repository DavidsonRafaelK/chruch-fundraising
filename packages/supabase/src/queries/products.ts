import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types";

const NOT_FOUND = "PGRST116";

export type ProductListingRow = Tables<"products"> & {
  is_new: boolean;
  categories: Pick<Tables<"categories">, "name"> | null;
};

/**
 * Customer-facing catalog. RLS already restricts this to
 * `is_available = true` rows for anon/authenticated callers — the explicit
 * filter below is redundant but kept for readability.
 *
 * `is_new` is computed DB-side by the `products_is_new` Postgres function
 * (a PostgREST computed column), not by comparing `Date.now()` here, so it
 * can't drift on clock skew or timezone differences between machines.
 */
export async function getProductListing(
  supabase: SupabaseClient<Database>,
  { categoryId }: { categoryId?: string } = {},
): Promise<ProductListingRow[]> {
  let query = supabase
    .from("products")
    .select("*, categories(name), is_new:products_is_new")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as unknown as ProductListingRow[];
}

export type ProductDetailRow = Tables<"products"> & {
  categories: Pick<Tables<"categories">, "has_ingredients"> | null;
};

/**
 * Single product, joined with its category's `has_ingredients` flag so the
 * caller can decide whether to render the ingredients section.
 *
 * A missing or RLS-hidden product comes back as zero rows, which `.single()`
 * turns into a PGRST116 error — that's treated as "not found" (`null`), not
 * an error to surface. Any other error still throws.
 */
export async function getProductDetail(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<ProductDetailRow | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(has_ingredients)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === NOT_FOUND) {
      return null;
    }
    throw error;
  }

  return data as unknown as ProductDetailRow;
}

export type AdminProductRow = Tables<"products"> & {
  categories: Pick<Tables<"categories">, "name"> | null;
};

/**
 * Admin management table. Unlike `getProductListing`, this is NOT filtered
 * to `is_available = true` — admins need to see and manage disabled
 * products too. RLS's `is_admin()` branch already allows seeing everything
 * for an authenticated admin; don't add an availability filter here.
 */
export async function getAdminProductsList(
  supabase: SupabaseClient<Database>,
): Promise<AdminProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as unknown as AdminProductRow[];
}
