"use server";

import { database, Prisma } from "@repo/database";
import { z } from "zod";
import type { CartLine } from "@/lib/cart-types";
import { getWhatsAppNumber } from "@repo/database/settings";

/**
 * Checkout runs entirely on the server, and deliberately so: `orders` and
 * `order_items` have no INSERT policy, so a browser holding the anon key
 * cannot create an order at all. The client only ever sends product ids and
 * quantities - every price is read from the database here, so a tampered cart
 * cannot change what is charged.
 */

const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

const checkoutSchema = z.object({
  lines: z.array(lineSchema).min(1, "Your cart is empty").max(50),
  customer: z.object({
    name: z.string().trim().min(1, "Name is required").max(200),
    phone: z.string().trim().min(5, "Phone number is required").max(30),
    note: z.string().trim().max(1000),
  }),
  couponCode: z.string().trim().max(50).nullable(),
});

export interface PricedLine {
  productId: string;
  title: string;
  unitPrice: string;
  quantity: number;
  subtotal: string;
}

export interface Quote {
  lines: PricedLine[];
  subtotal: string;
  discount: string;
  total: string;
  couponCode: string | null;
  couponError: string | null;
}

type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };

type OrderResult =
  | { ok: true; orderNumber: string; whatsappUrl: string | null }
  | { ok: false; error: string };

interface CouponOutcome {
  discount: Prisma.Decimal;
  code: string | null;
  error: string | null;
}

/**
 * Prices the cart from the database. Unavailable or deleted products are
 * rejected rather than silently dropped, so the customer never sees a total
 * that quietly changed.
 */
const priceCart = async (lines: CartLine[]) => {
  const products = await database.products.findMany({
    where: { id: { in: lines.map((line) => line.productId) } },
    select: { id: true, title: true, price: true, is_available: true },
  });

  const byId = new Map(products.map((product) => [product.id, product]));
  const priced: PricedLine[] = [];
  let subtotal = new Prisma.Decimal(0);

  for (const line of lines) {
    const product = byId.get(line.productId);

    if (!product) {
      throw new Error("A product in your cart is no longer available");
    }

    if (!product.is_available) {
      throw new Error(`${product.title} is currently unavailable`);
    }

    const lineTotal = product.price.mul(line.quantity);

    subtotal = subtotal.add(lineTotal);
    priced.push({
      productId: product.id,
      title: product.title,
      unitPrice: product.price.toFixed(2),
      quantity: line.quantity,
      subtotal: lineTotal.toFixed(2),
    });
  }

  return { priced, subtotal };
};

/**
 * Resolves a coupon against the cart subtotal. A coupon that does not apply is
 * reported as an error on the quote rather than throwing, so the customer can
 * still check out without it.
 */
const applyCoupon = async (
  code: string | null,
  subtotal: Prisma.Decimal
): Promise<CouponOutcome> => {
  const none = { discount: new Prisma.Decimal(0), code: null, error: null };

  if (!code) {
    return none;
  }

  const coupon = await database.coupons.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!coupon) {
    return { ...none, error: "That code does not exist" };
  }

  const now = new Date();

  if (!coupon.is_active) {
    return { ...none, error: "That code is no longer active" };
  }

  if (coupon.starts_at && coupon.starts_at > now) {
    return { ...none, error: "That code is not active yet" };
  }

  if (coupon.ends_at && coupon.ends_at <= now) {
    return { ...none, error: "That code has expired" };
  }

  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    return { ...none, error: "That code has been fully redeemed" };
  }

  if (subtotal.lessThan(coupon.min_order_amount)) {
    return {
      ...none,
      error: `Spend at least ${coupon.min_order_amount.toFixed(0)} to use this code`,
    };
  }

  let discount =
    coupon.discount_type === "percent"
      ? subtotal.mul(coupon.discount_value).div(100)
      : coupon.discount_value;

  if (coupon.max_discount_amount && discount.greaterThan(coupon.max_discount_amount)) {
    discount = coupon.max_discount_amount;
  }

  // Never discount below zero: orders_total_math would reject the row.
  if (discount.greaterThan(subtotal)) {
    discount = subtotal;
  }

  return { discount, code: coupon.code, error: null };
};

export const getQuote = async (
  lines: CartLine[],
  couponCode: string | null
): Promise<QuoteResult> => {
  try {
    const parsedLines = z.array(lineSchema).max(50).parse(lines);

    if (parsedLines.length === 0) {
      return { ok: false, error: "Your cart is empty" };
    }

    const { priced, subtotal } = await priceCart(parsedLines);
    const coupon = await applyCoupon(couponCode, subtotal);
    const total = subtotal.sub(coupon.discount);

    return {
      ok: true,
      quote: {
        lines: priced,
        subtotal: subtotal.toFixed(2),
        discount: coupon.discount.toFixed(2),
        total: total.toFixed(2),
        couponCode: coupon.code,
        couponError: coupon.error,
      },
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const placeOrder = async (input: {
  lines: CartLine[];
  customer: { name: string; phone: string; note: string };
  couponCode: string | null;
}): Promise<OrderResult> => {
  try {
    const { lines, customer, couponCode } = checkoutSchema.parse(input);

    const { priced, subtotal } = await priceCart(lines);
    const coupon = await applyCoupon(couponCode, subtotal);

    // A coupon that stopped applying between quote and submit must not be
    // silently ignored - the customer agreed to a total that included it.
    if (couponCode && coupon.error) {
      return { ok: false, error: coupon.error };
    }

    const total = subtotal.sub(coupon.discount);

    const order = await database.$transaction(async (tx) => {
      if (coupon.code) {
        // Atomic guard: the update only matches while the limit still has room,
        // so two shoppers cannot both take the last redemption.
        const claimed = await tx.coupons.updateMany({
          where: {
            code: coupon.code,
            is_active: true,
            OR: [
              { usage_limit: null },
              { usage_limit: { gt: await currentUsage(tx, coupon.code) } },
            ],
          },
          data: { used_count: { increment: 1 } },
        });

        if (claimed.count === 0) {
          throw new Error("That code has been fully redeemed");
        }
      }

      return tx.orders.create({
        data: {
          order_number: buildOrderNumber(),
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_note: customer.note === "" ? null : customer.note,
          subtotal_amount: subtotal,
          discount_amount: coupon.discount,
          total_amount: total,
          coupon_code: coupon.code,
          order_items: {
            create: priced.map((line) => ({
              product_id: line.productId,
              product_name_snapshot: line.title,
              unit_price_snapshot: line.unitPrice,
              quantity: line.quantity,
              subtotal: line.subtotal,
            })),
          },
        },
        select: { order_number: true },
      });
    });

    return {
      ok: true,
      orderNumber: order.order_number,
      whatsappUrl: await buildWhatsAppUrl({
        orderNumber: order.order_number,
        lines: priced,
        subtotal,
        discount: coupon.discount,
        total,
        couponCode: coupon.code,
        customer,
      }),
    };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

const idr = (value: Prisma.Decimal | string): string =>
  `Rp${new Prisma.Decimal(value).toNumber().toLocaleString("id-ID")}`;

/**
 * Builds the wa.me link the customer is sent to after ordering. Returns null
 * when no number is configured, so checkout still completes - the order is
 * already saved either way.
 */
const buildWhatsAppUrl = async (order: {
  orderNumber: string;
  lines: PricedLine[];
  subtotal: Prisma.Decimal;
  discount: Prisma.Decimal;
  total: Prisma.Decimal;
  couponCode: string | null;
  customer: { name: string; phone: string; note: string };
}): Promise<string | null> => {
  const number = await getWhatsAppNumber();

  if (!number) {
    return null;
  }

  const items = order.lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.title} x${line.quantity} - ${idr(line.subtotal)}`
    )
    .join("\n");

  const parts = [
    `Halo, saya mau pesan: *${order.orderNumber}*`,
    "",
    items,
    "",
    `Subtotal: ${idr(order.subtotal)}`,
  ];

  if (order.discount.greaterThan(0)) {
    parts.push(
      `Diskon${order.couponCode ? ` (${order.couponCode})` : ""}: -${idr(order.discount)}`
    );
  }

  parts.push(
    `*Total: ${idr(order.total)}*`,
    "",
    `Nama: ${order.customer.name}`,
    `Telepon: ${order.customer.phone}`
  );

  if (order.customer.note) {
    parts.push(`Catatan: ${order.customer.note}`);
  }

  return `https://wa.me/${number}?text=${encodeURIComponent(parts.join("\n"))}`;
};

const currentUsage = async (
  tx: Prisma.TransactionClient,
  code: string
): Promise<number> => {
  const coupon = await tx.coupons.findUnique({
    where: { code },
    select: { used_count: true },
  });

  return coupon?.used_count ?? 0;
};

/** Human-readable and unique enough for a single store's daily volume. */
const buildOrderNumber = (): string => {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `ORD-${date}-${suffix}`;
};

const toMessage = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.issues.at(0)?.message ?? "Invalid input";
  }

  return error instanceof Error ? error.message : "Something went wrong";
};
