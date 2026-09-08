"use server";

import { requireAdmin } from "@repo/auth/roles";
import { database } from "@repo/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordAudit } from "./audit";

const faqSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(300),
  answer: z.string().trim().min(1, "Answer is required").max(5000),
  sort_order: z.coerce.number().int().min(0),
  is_active: z.boolean(),
});

export type FaqInput = z.input<typeof faqSchema>;

type ActionResult = { ok: true } | { ok: false; error: string };

const revalidate = () => {
  revalidatePath("/faqs");
};

export const createFaq = async (input: FaqInput): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = faqSchema.parse(input);

    const faq = await database.faqs.create({ data });

    await recordAudit(actor, "create", "faq", faq.id, faq.question);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const updateFaq = async (
  id: string,
  input: FaqInput
): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const data = faqSchema.parse(input);

    const faq = await database.faqs.update({ where: { id }, data });

    await recordAudit(actor, "update", "faq", faq.id, faq.question);
    revalidate();

    return { ok: true };
  } catch (error) {
    return { ok: false, error: toMessage(error) };
  }
};

export const deleteFaq = async (id: string): Promise<ActionResult> => {
  try {
    const actor = await requireAdmin();
    const faq = await database.faqs.delete({ where: { id } });

    await recordAudit(actor, "delete", "faq", faq.id, faq.question);
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

  return error instanceof Error ? error.message : "Something went wrong";
};
