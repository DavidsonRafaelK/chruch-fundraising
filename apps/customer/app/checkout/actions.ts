"use server";

import { toUserError } from "@repo/supabase/error";
import { createClient } from "@repo/supabase/server";
import { headers } from "next/headers";
import { whatsappPhoneNumber } from "@/lib/env";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { isUuid } from "@/lib/validation";

export type CreateOrderItem = {
  productId: string;
  quantity: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerNote?: string;
  items: CreateOrderItem[];
  turnstileToken: string;
};

export type CreateOrderResult =
  | { success: true; orderNumber: string; whatsappUrl: string }
  | { success: false; error: string };

type ParsedOrderInput =
  | {
      ok: true;
      customerName: string;
      customerPhone: string;
      customerNote: string | null;
      items: CreateOrderItem[];
      turnstileToken: string;
    }
  | { ok: false; error: string };

/**
 * Takes unknown on purpose. The CreateOrderInput annotation the form calls
 * this with documents intent but does not enforce it at runtime — this is
 * the boundary that does. Business rules (name/phone length, item quantity
 * caps, item non-emptiness) are re-validated and enforced authoritatively by
 * the create_order() Postgres function; this only rejects shapes that
 * function can't make sense of.
 */
function parseOrderInput(input: unknown): ParsedOrderInput {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Invalid order data." };
  }

  const { customerName, customerPhone, customerNote, items, turnstileToken } =
    input as Record<string, unknown>;

  if (typeof customerName !== "string" || !customerName.trim()) {
    return { ok: false, error: "Your name is required." };
  }

  if (typeof customerPhone !== "string" || !customerPhone.trim()) {
    return { ok: false, error: "Your phone number is required." };
  }

  if (customerNote !== undefined && typeof customerNote !== "string") {
    return { ok: false, error: "Invalid order data." };
  }

  if (typeof turnstileToken !== "string" || !turnstileToken) {
    return { ok: false, error: "Please complete the verification challenge." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }

  const parsedItems: CreateOrderItem[] = [];
  for (const raw of items) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Invalid item in cart." };
    }
    const { productId, quantity } = raw as Record<string, unknown>;
    if (!isUuid(productId)) {
      return { ok: false, error: "Invalid item in cart." };
    }
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return { ok: false, error: "Invalid item quantity in cart." };
    }
    parsedItems.push({ productId, quantity });
  }

  return {
    ok: true,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim(),
    customerNote: customerNote?.trim() || null,
    items: parsedItems,
    turnstileToken,
  };
}

function buildWhatsappUrl(whatsappDigits: string, orderNumber: string): string {
  const message = `Olá! Acabei de confirmar meu pedido ${orderNumber}.`;
  return `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
}

export async function createOrderAction(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const parsed = parseOrderInput(input);
  if (!parsed.ok) {
    return { success: false, error: parsed.error };
  }

  // Resolved before writing anything — a misconfigured phone number should
  // fail the request up front, not after an order has already been created
  // with no way left to hand the customer a WhatsApp link.
  const whatsappDigits = whatsappPhoneNumber().replace(/\D/g, "");

  const requestHeaders = await headers();
  const remoteIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();

  const verified = await verifyTurnstileToken(parsed.turnstileToken, remoteIp);
  if (!verified) {
    return {
      success: false,
      error: "Verification failed. Please try again.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_customer_name: parsed.customerName,
    p_customer_phone: parsed.customerPhone,
    // Generated Args type says `string`, but the Postgres function accepts
    // (and expects) null for "no note" — the generator doesn't model
    // nullable-with-no-default args accurately.
    p_customer_note: parsed.customerNote as string,
    p_items: parsed.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    return {
      success: false,
      error: toUserError(
        "createOrderAction",
        error,
        "Could not place your order. Please try again.",
      ),
    };
  }

  return {
    success: true,
    orderNumber: data.order_number,
    whatsappUrl: buildWhatsappUrl(whatsappDigits, data.order_number),
  };
}
