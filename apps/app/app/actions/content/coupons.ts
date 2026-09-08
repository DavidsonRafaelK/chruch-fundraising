"use server";

import { requireAdmin } from "@repo/auth/roles";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "./audit";

const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Code must be at least 3 characters")
      .max(50)
      .regex(/^[A-Za-z0-9_-]+$/, "Code may only use letters, numbers, - and _")
      .transform((value) => value.toUpperCase()),
    description: z
      .string()
      .trim()
      .max(300)
      .transform((value) => (value === "" ? null : value))
      .nullable(),
    discount_type: z.enum(["percent", "fixed"]),
    discount_value: z.coerce.number().positive("Discount must be above zero"),
    max_discount_amount: z.coerce.number().min(0).nullable(),
    min_order_amount: z.coerce.number().min(0),
    usage_limit: z.coerce.number().int().positive().nullable(),
    starts_at: z.coerce.date().nullable(),
    ends_at: z.coerce.date().nullable(),
    is_active: z.boolean(),
  })
  .refine(
    (value) => value.discount_type !== "percent" || value.discount_value <= 100,
    { message: "A percentage discount cannot exceed 100", path: ["discount_value"] }
  )
  .refine(
    (value) =>
      !(value.starts_at && value.ends_at) || value.ends_at > value.starts_at,
    { message: "End date must be after start date", path: ["ends_at"] }
  );

export type CouponInput = z.input<typeof couponSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

const revalidate = () => {
  revalidatePath("/coupons");
};

export const createCoupon = async (
  input: CouponInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = couponSchema.parse(input);

    const coupon = await database.coupons.create({ data });

    await recordAudit(actor, "create", "coupon", coupon.id, coupon.code);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const updateCoupon = async (
  id: string,
  input: CouponInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = couponSchema.parse(input);

    const coupon = await database.coupons.update({ where: { id }, data });

    await recordAudit(actor, "update", "coupon", coupon.id, coupon.code);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const deleteCoupon = async (id: string): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const coupon = await database.coupons.delete({ where: { id } });

    await recordAudit(actor, "delete", "coupon", coupon.id, coupon.code);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

const toMessage = (error: unknown): string => {
  if (error instanceof z.ZodError) {
    return error.issues.at(0)?.message ?? "Invalid input";
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  ) {
    return "That coupon code already exists";
  }

  return error instanceof Error ? error.message : "Something went wrong";
};
