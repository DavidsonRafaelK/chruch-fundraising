import { beforeAll, describe, expect, it } from "vitest";

process.env.CLOUDINARY_CLOUD_NAME = "demo";
process.env.CLOUDINARY_API_KEY = "key";
process.env.CLOUDINARY_API_SECRET = "secret";

let getPublicId: (url: string) => string | null;

beforeAll(async () => {
  ({ getPublicId } = await import("../index"));
});

describe("getPublicId", () => {
  it("reads a plain upload URL", () => {
    expect(
      getPublicId("https://res.cloudinary.com/demo/image/upload/v1712345678/store/abc123.jpg")
    ).toBe("store/abc123");
  });

  it("keeps nested folders", () => {
    expect(
      getPublicId("https://res.cloudinary.com/demo/image/upload/v1/store/products/x.webp")
    ).toBe("store/products/x");
  });

  it("skips transformation segments", () => {
    expect(
      getPublicId("https://res.cloudinary.com/demo/image/upload/w_500,h_500,c_fill/v1712345678/store/abc.png")
    ).toBe("store/abc");
  });

  it("handles a URL with no version", () => {
    expect(
      getPublicId("https://res.cloudinary.com/demo/image/upload/store/abc.jpg")
    ).toBe("store/abc");
  });

  it("keeps dots inside the public id", () => {
    expect(
      getPublicId("https://res.cloudinary.com/demo/image/upload/v1/store/my.photo.v2.jpg")
    ).toBe("store/my.photo.v2");
  });

  // The dangerous cases: anything we do not own must be left alone.
  it("refuses a different cloud", () => {
    expect(
      getPublicId("https://res.cloudinary.com/someone-else/image/upload/v1/store/abc.jpg")
    ).toBeNull();
  });

  it("refuses a non-Cloudinary host", () => {
    expect(
      getPublicId("https://images.unsplash.com/photo-123?w=1600")
    ).toBeNull();
  });

  it("refuses a lookalike hostname", () => {
    expect(
      getPublicId("https://res.cloudinary.com.evil.test/demo/image/upload/v1/store/a.jpg")
    ).toBeNull();
  });

  it("refuses junk", () => {
    expect(getPublicId("not a url")).toBeNull();
    expect(getPublicId("")).toBeNull();
  });
});
