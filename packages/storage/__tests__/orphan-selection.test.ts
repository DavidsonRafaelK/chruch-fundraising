import { beforeAll, describe, expect, it } from "vitest";

process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "key";
process.env.CLOUDINARY_API_SECRET = "secret";

let getPublicId: (url: string) => string | null;

beforeAll(async () => {
  ({ getPublicId } = await import("../index"));
});

/**
 * Mirrors the selection rules in apps/api/app/cron/cleanup-images/route.ts.
 * Kept here so the deletion criteria are provable without a live Cloudinary
 * account or database.
 */
const GRACE_MS = 24 * 60 * 60 * 1000;
const MAX_DELETES = 100;

const selectOrphans = (
  stored: { publicId: string; createdAt: Date }[],
  referencedUrls: (string | null)[],
  now: number
) => {
  const referenced = new Set(
    referencedUrls
      .map((url) => (url ? getPublicId(url) : null))
      .filter((id): id is string => id !== null)
  );

  return stored
    .filter(
      (image) =>
        !referenced.has(image.publicId) &&
        image.createdAt.getTime() < now - GRACE_MS
    )
    .slice(0, MAX_DELETES);
};

const NOW = new Date("2026-09-08T12:00:00Z").getTime();
const old = new Date(NOW - 48 * 60 * 60 * 1000);
const fresh = new Date(NOW - 1 * 60 * 60 * 1000);
const url = (id: string) =>
  `https://res.cloudinary.com/demo/image/upload/v1712345678/${id}.jpg`;

describe("orphan selection", () => {
  it("deletes an old unreferenced image", () => {
    const picked = selectOrphans(
      [{ publicId: "store/orphan", createdAt: old }],
      [],
      NOW
    );

    expect(picked.map((image) => image.publicId)).toEqual(["store/orphan"]);
  });

  it("keeps a referenced image no matter how old", () => {
    const picked = selectOrphans(
      [{ publicId: "store/used", createdAt: old }],
      [url("store/used")],
      NOW
    );

    expect(picked).toHaveLength(0);
  });

  it("keeps a fresh image even when unreferenced", () => {
    const picked = selectOrphans(
      [{ publicId: "store/just-uploaded", createdAt: fresh }],
      [],
      NOW
    );

    expect(picked).toHaveLength(0);
  });

  it("matches a reference whose URL carries transformations", () => {
    const picked = selectOrphans(
      [{ publicId: "store/used", createdAt: old }],
      ["https://res.cloudinary.com/demo/image/upload/w_400,c_fill/v99/store/used.webp"],
      NOW
    );

    expect(picked).toHaveLength(0);
  });

  it("ignores third-party URLs when building the referenced set", () => {
    const picked = selectOrphans(
      [{ publicId: "store/orphan", createdAt: old }],
      ["https://images.unsplash.com/photo-1", null],
      NOW
    );

    expect(picked.map((image) => image.publicId)).toEqual(["store/orphan"]);
  });

  it("caps a single run", () => {
    const stored = Array.from({ length: 150 }, (_, index) => ({
      publicId: `store/orphan-${index}`,
      createdAt: old,
    }));

    expect(selectOrphans(stored, [], NOW)).toHaveLength(MAX_DELETES);
  });
});
