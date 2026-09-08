import { database } from "@repo/database";
import {
  deleteByPublicId,
  getPublicId,
  isStorageConfigured,
  listAllImages,
} from "@repo/storage";
import { env } from "@/env";

/**
 * Deletes Cloudinary images that no product or banner references any more.
 *
 * Uploads happen before a form is saved, so abandoning a form leaves an asset
 * with no row pointing at it. Normal edits and deletes clean up after
 * themselves; this catches what they cannot see.
 *
 * Safety rules, in order of importance:
 *
 * 1. Fail closed. If the database read throws, nothing is deleted - treating a
 *    query error as "nothing is referenced" would wipe the entire folder.
 * 2. Grace period. Assets younger than GRACE_HOURS are always kept, because a
 *    form may still be open in someone's browser.
 * 3. Bounded. At most MAX_DELETES per run, so a bug cannot empty the account
 *    in one pass.
 * 4. Scoped. Only images under the configured folder are ever considered.
 */
const GRACE_HOURS = 24;
const MAX_DELETES = 100;

const isAuthorized = (request: Request): boolean => {
  const secret = env.CRON_SECRET;

  // Without a configured secret the endpoint stays closed rather than open.
  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
};

const getReferencedPublicIds = async (): Promise<Set<string>> => {
  const [products, banners] = await Promise.all([
    database.products.findMany({
      select: { image_url: true, image_url_2: true, image_url_3: true },
    }),
    database.banners.findMany({ select: { image_url: true } }),
  ]);

  const referenced = new Set<string>();

  const add = (url: string | null) => {
    const publicId = url ? getPublicId(url) : null;

    if (publicId) {
      referenced.add(publicId);
    }
  };

  for (const product of products) {
    add(product.image_url);
    add(product.image_url_2);
    add(product.image_url_3);
  }

  for (const banner of banners) {
    add(banner.image_url);
  }

  return referenced;
};

export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!isStorageConfigured()) {
    return Response.json({ skipped: "Cloudinary is not configured" });
  }

  let referenced: Set<string>;
  let stored: Awaited<ReturnType<typeof listAllImages>>;

  try {
    // Rule 1: both reads must succeed before anything is deleted.
    [referenced, stored] = await Promise.all([
      getReferencedPublicIds(),
      listAllImages(),
    ]);
  } catch (error) {
    return Response.json(
      {
        error: "Aborted before deleting anything",
        detail: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 }
    );
  }

  const cutoff = Date.now() - GRACE_HOURS * 60 * 60 * 1000;

  const orphans = stored.filter(
    (image) =>
      !referenced.has(image.publicId) && image.createdAt.getTime() < cutoff
  );

  const targets = orphans.slice(0, MAX_DELETES);
  const results = await Promise.all(
    targets.map(async (image) => ({
      publicId: image.publicId,
      deleted: await deleteByPublicId(image.publicId),
    }))
  );

  const deleted = results.filter((result) => result.deleted);

  if (deleted.length > 0) {
    await database.audit_logs
      .create({
        data: {
          actor_label: "cron",
          action: "delete",
          entity: "image",
          summary: `Removed ${deleted.length} orphaned image${
            deleted.length === 1 ? "" : "s"
          } from Cloudinary`,
          metadata: { publicIds: deleted.map((result) => result.publicId) },
        },
      })
      .catch(() => {
        // An audit failure must not turn a successful cleanup into an error.
      });
  }

  return Response.json({
    scanned: stored.length,
    referenced: referenced.size,
    orphaned: orphans.length,
    deleted: deleted.length,
    remaining: Math.max(orphans.length - targets.length, 0),
  });
};
