"use server";

import { requireAdmin } from "@repo/auth/roles";
import { createUploadSignature, type UploadSignature } from "@repo/storage";

type SignatureResult =
  | { ok: true; signature: UploadSignature }
  | { ok: false; error: string };

/**
 * Mints a Cloudinary upload signature for the browser. Admin-only: without
 * this check anyone signed in could obtain upload credentials.
 */
export const getUploadSignature = async (): Promise<SignatureResult> => {
  try {
    await requireAdmin();

    const signature = createUploadSignature();

    if (!signature) {
      return { ok: false, error: "Cloudinary is not configured" };
    }

    return { ok: true, signature };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Something went wrong",
    };
  }
};
