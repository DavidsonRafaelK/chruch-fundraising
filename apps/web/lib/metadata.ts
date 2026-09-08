import "server-only";

import { getStoreName } from "@repo/database/settings";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";

type Input = Parameters<typeof createMetadata>[0];

/**
 * Wraps the shared metadata helper with the admin-managed store name, so the
 * SEO package stays generic and only the storefront knows where the name comes
 * from.
 */
export const createStoreMetadata = async (input: Input): Promise<Metadata> =>
  createMetadata({ ...input, applicationName: await getStoreName() });
