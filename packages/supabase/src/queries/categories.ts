import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "../types";

/**
 * Public read (RLS allows `anon` + `authenticated`), ordered for display.
 * Used by both the customer filter UI and the admin category picker/table —
 * same function, same shape, both callers.
 */
export async function getCategories(
  supabase: SupabaseClient<Database>,
): Promise<Tables<"categories">[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}
