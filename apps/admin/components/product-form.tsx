"use client";

import type { Tables } from "@repo/supabase/types";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
} from "@/app/(admin)/products/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/*
 * Three fixed slots, matching the image_url / image_url_2 / image_url_3
 * columns. Slot 0 is the cover and is the one the storefront always shows.
 */
const SLOT_COUNT = 3;

export function ProductForm({
  product,
  categories,
}: {
  /* Absent when creating: the same form owns both paths. */
  product?: Tables<"products">;
  categories: Tables<"categories">[];
}) {
  const router = useRouter();
  const [images, setImages] = useState<(string | null)[]>([
    product?.image_url ?? null,
    product?.image_url_2 ?? null,
    product?.image_url_3 ?? null,
  ]);
  const [categoryId, setCategoryId] = useState(
    product?.category_id ?? categories[0]?.id ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const showIngredients = categories.find(
    (category) => category.id === categoryId,
  )?.has_ingredients;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setSaved(false);

    const input = {
      title: String(data.get("title") ?? ""),
      shortDescription: String(data.get("shortDescription") ?? ""),
      longDescription: String(data.get("longDescription") ?? ""),
      /* Ingredients only exist for categories that declare them. */
      ingredients: showIngredients ? String(data.get("ingredients") ?? "") : "",
      categoryId,
      price: Number(data.get("price")),
      isAvailable: data.get("isAvailable") === "on",
      imageUrl: images[0] ?? "",
      imageUrl2: images[1] ?? null,
      imageUrl3: images[2] ?? null,
    };

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, input)
        : await createProduct(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (product) {
        setSaved(true);
        router.refresh();
        return;
      }

      router.push(`/products/${result.product.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={product?.title}
              required
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shortDescription">Short description</Label>
            <Textarea
              id="shortDescription"
              name="shortDescription"
              defaultValue={product?.short_description}
              required
              maxLength={300}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Shown on the product card in the catalogue.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="longDescription">Full description</Label>
            <Textarea
              id="longDescription"
              name="longDescription"
              defaultValue={product?.long_description ?? ""}
              maxLength={5000}
              rows={6}
            />
          </div>

          {showIngredients && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ingredients">Ingredients</Label>
              <Textarea
                id="ingredients"
                name="ingredients"
                defaultValue={product?.ingredients ?? ""}
                maxLength={2000}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown on the product page for categories that list ingredients.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={product ? Number(product.price) : ""}
                required
                className="max-w-40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="h-8 rounded-2xl border border-border bg-input/50 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 py-1.5 text-sm">
              <input
                type="checkbox"
                name="isAvailable"
                defaultChecked={product ? product.is_available : true}
                className="size-4"
              />
              Visible in the storefront
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Photos</span>
            <p className="text-xs text-muted-foreground">
              The first photo is the cover. JPEG, PNG, WebP, or AVIF, up to
              5&nbsp;MB.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            {Array.from({ length: SLOT_COUNT }, (_, slot) => (
              <ImageSlot
                key={slot}
                url={images[slot] ?? null}
                isCover={slot === 0}
                onChange={(url) =>
                  setImages((current) =>
                    current.map((value, index) =>
                      index === slot ? url : value,
                    ),
                  )
                }
                onError={setError}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
        {saved && !pending && (
          <span className="text-sm text-muted-foreground">Saved.</span>
        )}
      </div>
    </form>
  );
}

function ImageSlot({
  url,
  isCover,
  onChange,
  onError,
}: {
  url: string | null;
  isCover: boolean;
  onChange: (url: string | null) => void;
  onError: (message: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    onError(null);
    setUploading(true);

    const data = new FormData();
    data.set("file", file);
    const result = await uploadProductImage(data);

    setUploading(false);

    if (!result.success) {
      onError(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative size-32 overflow-hidden rounded-2xl border border-border bg-muted">
        {url ? (
          <Image src={url} alt="" fill sizes="128px" className="object-cover" />
        ) : null}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!url && !uploading && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted/60"
          >
            <ImagePlus className="size-5" />
            Add photo
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            /*
             * Reset the input so picking the same file twice still fires a
             * change event after a failed upload.
             */
            event.target.value = "";
            if (file) {
              void handleFile(file);
            }
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {isCover ? "Cover" : "Optional"}
        </span>
        {url && (
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Replace photo"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus />
            </Button>
            {!isCover && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label="Remove photo"
                disabled={uploading}
                onClick={() => onChange(null)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
