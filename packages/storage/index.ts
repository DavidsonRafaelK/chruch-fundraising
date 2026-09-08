import "server-only";

import { createHash } from "node:crypto";
import { keys } from "./keys";

/**
 * Signed direct uploads to Cloudinary.
 *
 * The browser posts the file straight to Cloudinary using a signature minted
 * here, so image bytes never travel through the Next.js server and no unsigned
 * upload preset is left open to the public. Signatures are only ever created
 * behind an admin check - see the server action that calls this.
 */
export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  uploadUrl: string;
}

export const isStorageConfigured = (): boolean => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    keys();

  return Boolean(
    CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET
  );
};

/**
 * Cloudinary signs the request parameters, sorted by key and joined as a query
 * string, with the API secret appended. Only the parameters signed here may be
 * sent by the browser, or Cloudinary rejects the upload.
 */
const sign = (parameters: Record<string, string>, secret: string): string => {
  const payload = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");

  return createHash("sha1").update(`${payload}${secret}`).digest("hex");
};

export const createUploadSignature = (): UploadSignature | null => {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER,
  } = keys();

  if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = CLOUDINARY_UPLOAD_FOLDER ?? "store";

  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature: sign(
      { folder, timestamp: String(timestamp) },
      CLOUDINARY_API_SECRET
    ),
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
  };
};

/**
 * Cloudinary delivery URLs look like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v1712345678/store/abc123.jpg
 *
 * The destroy API needs the public id ("store/abc123"), which is everything
 * after the upload segment minus the optional version prefix and the file
 * extension. Returns null for anything that is not a Cloudinary upload URL -
 * admins may still paste links to images we do not own, and those must never
 * be touched.
 */
export const getPublicId = (url: string): string | null => {
  const { CLOUDINARY_CLOUD_NAME } = keys();

  if (!CLOUDINARY_CLOUD_NAME) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname !== "res.cloudinary.com") {
    return null;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  const uploadAt = segments.indexOf("upload");

  // Expect: <cloud>/image/upload/... and reject other people's clouds.
  if (uploadAt === -1 || segments[0] !== CLOUDINARY_CLOUD_NAME) {
    return null;
  }

  let rest = segments.slice(uploadAt + 1);

  // Transformations sit between "upload" and the version; a version segment is
  // "v" followed by digits. Drop everything up to and including it.
  const versionAt = rest.findIndex((segment) => /^v\d+$/.test(segment));

  if (versionAt !== -1) {
    rest = rest.slice(versionAt + 1);
  }

  if (rest.length === 0) {
    return null;
  }

  const path = rest.join("/");
  const lastDot = path.lastIndexOf(".");

  return lastDot === -1 ? path : path.slice(0, lastDot);
};

/**
 * Best-effort removal: callers delete the database row first, so a failure here
 * leaves an orphaned asset rather than an inconsistent store.
 */
export const deleteImage = async (url: string): Promise<boolean> => {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
  } = keys();

  if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
    return false;
  }

  const publicId = getPublicId(url);

  return publicId ? deleteByPublicId(publicId) : false;
};

/**
 * Deletes assets that appear in `previous` but no longer in `next`, so editing
 * a record cleans up the image it replaced. Never throws.
 */
export const deleteRemovedImages = async (
  previous: (string | null | undefined)[],
  next: (string | null | undefined)[]
): Promise<void> => {
  const kept = new Set(next.filter(Boolean));
  const dropped = previous.filter(
    (url): url is string => Boolean(url) && !kept.has(url)
  );

  await Promise.all(dropped.map((url) => deleteImage(url)));
};

export interface StoredImage {
  publicId: string;
  createdAt: Date;
}

interface ListPage {
  images: StoredImage[];
  cursor: string | null;
}

const adminAuth = (apiKey: string, apiSecret: string): string =>
  `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;

/**
 * One page of uploaded images under the configured folder, via the Admin API.
 * Throws on failure: callers that delete things must not mistake an API error
 * for "this folder is empty".
 */
export const listImages = async (cursor?: string): Promise<ListPage> => {
  const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER,
  } = keys();

  if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
    throw new Error("Cloudinary is not configured");
  }

  const query = new URLSearchParams({
    prefix: CLOUDINARY_UPLOAD_FOLDER ?? "store",
    max_results: "500",
    type: "upload",
  });

  if (cursor) {
    query.set("next_cursor", cursor);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image?${query}`,
    {
      headers: {
        Authorization: adminAuth(CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudinary list failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    resources?: { public_id: string; created_at: string }[];
    next_cursor?: string;
  };

  return {
    images: (payload.resources ?? []).map((resource) => ({
      publicId: resource.public_id,
      createdAt: new Date(resource.created_at),
    })),
    cursor: payload.next_cursor ?? null,
  };
};

/**
 * Every image stored under the configured folder, following pagination.
 */
export const listAllImages = async (): Promise<StoredImage[]> => {
  const all: StoredImage[] = [];
  let cursor: string | undefined;

  do {
    const page = await listImages(cursor);

    all.push(...page.images);
    cursor = page.cursor ?? undefined;
  } while (cursor);

  return all;
};

export const deleteByPublicId = async (publicId: string): Promise<boolean> => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    keys();

  if (!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET)) {
    return false;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({
    public_id: publicId,
    api_key: CLOUDINARY_API_KEY,
    timestamp: String(timestamp),
    signature: sign(
      { public_id: publicId, timestamp: String(timestamp) },
      CLOUDINARY_API_SECRET
    ),
  });

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`,
      { method: "POST", body }
    );

    const payload = (await response.json()) as { result?: string };

    return payload.result === "ok";
  } catch {
    return false;
  }
};
