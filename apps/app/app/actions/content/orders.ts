"use server";

import { requireAdmin } from "@repo/auth/roles";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { recordAudit } from "./audit";

/**
 * Mirrors the database trigger `enforce_order_update_rules`. The database is
 * the real gatekeeper; this map exists so the UI only offers legal moves.
 */
export const STATUS_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

type ActionResult = { ok: true } | { ok: false; error: string };

export const updateOrderStatus = async (
  id: string,
  status: string
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();

    const order = await database.orders.findUnique({ where: { id } });

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    if (!STATUS_FLOW[order.status]?.includes(status)) {
      return {
        ok: false,
        error: `Cannot move an order from ${order.status} to ${status}`,
      };
    }

    await database.orders.update({ where: { id }, data: { status } });

    await recordAudit(
      actor,
      "update",
      "order",
      id,
      `${order.order_number}: ${order.status} to ${status}`
    );

    revalidatePath("/orders");
    revalidatePath(`/orders/${id}`);

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong",
    };
  }
};
