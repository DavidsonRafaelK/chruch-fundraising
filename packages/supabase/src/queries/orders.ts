import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types";

const NOT_FOUND = "PGRST116";

/**
 * Admin orders table. RLS restricts `orders` selects to admins anyway, but
 * the calling Server Component should still call `requireAdmin()` itself
 * for the redirect/UX layer — same Layer 1/Layer 2 pattern as everywhere
 * else in admin.
 *
 * Deliberately does not join `order_items` — keeps the list view a single
 * cheap query with no N+1; item-level detail is `getOrderDetail`'s job.
 */
export async function getOrdersList(
  supabase: SupabaseClient<Database>,
  { status }: { status?: string } = {},
): Promise<Tables<"orders">[]> {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export type OrderDetail = Tables<"orders"> & {
  order_items: Tables<"order_items">[];
};

/**
 * Single order + its line items. The join is fine here since it's one row,
 * not a list. A missing/inaccessible order comes back as zero rows, which
 * `.single()` turns into a PGRST116 error — treated as "not found" (`null`),
 * not an error to surface.
 */
export async function getOrderDetail(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === NOT_FOUND) {
      return null;
    }
    throw error;
  }

  return data as unknown as OrderDetail;
}
