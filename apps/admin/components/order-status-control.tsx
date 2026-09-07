"use client";

import { useState, useTransition } from "react";
import {
  type OrderStatus,
  updateOrderStatus,
} from "@/app/(admin)/orders/actions";
import { Button } from "@/components/ui/button";

/*
 * Mirrors the transitions allowed by the enforce_order_update_rules trigger
 * in database/schema.sql. The trigger is the real guard — this map only
 * keeps the UI from offering a move the database will reject.
 */
const NEXT_STATUSES: Record<string, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function OrderStatusControl({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = NEXT_STATUSES[status] ?? [];

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This order is {status} — no further changes are possible.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={option === "cancelled" ? "destructive" : "default"}
            disabled={pending}
            className="capitalize"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await updateOrderStatus(orderId, option);
                if (!result.success) {
                  setError(result.error);
                }
              });
            }}
          >
            Mark {option}
          </Button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
