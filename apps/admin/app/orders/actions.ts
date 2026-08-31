"use server";

import { toUserError } from "@repo/supabase/error";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { revalidatePath } from "next/cache";
import { isUuid } from "@/lib/validation";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "ready",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type UpdateOrderStatusResult =
  | { success: true }
  | { success: false; error: string };

function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}

/*
 * customer_note is the customer's own checkout note and stays read-only in
 * the admin UI. There is no admin_note column yet, and this action does
 * not touch customer_note. An internal-notes feature needs its own column
 * (see task notes) but isn't built here since it wasn't requested.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  await requireAdmin();

  if (!isUuid(orderId)) {
    return { success: false, error: "Invalid order." };
  }

  if (!isOrderStatus(newStatus)) {
    return { success: false, error: "Invalid order status." };
  }

  const supabase = await createClient();
  /*
   * Transition validity and immutable-field protection are enforced by the
   * enforce_order_update_rules trigger, not re-implemented here.
   */
  const { error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId);

  if (error) {
    /*
     * The trigger raises a human-readable exception for invalid transitions
     * (e.g. "Invalid status transition from completed to pending"). That one
     * is surfaced as-is by toUserError. Anything else stays generic.
     */
    return {
      success: false,
      error: toUserError(
        "updateOrderStatus",
        error,
        "Could not update the order. Try again.",
      ),
    };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}
