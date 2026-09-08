"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ImageField } from "../../components/image-field";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createProduct,
  type ProductInput,
  updateProduct,
} from "@/app/actions/content/products";
import type { CategoryOption, ProductRow } from "./product-table";

interface ProductFormProps {
  product: ProductRow | null;
  categories: CategoryOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProductForm = ({
  product,
  categories,
  open,
  onOpenChange,
}: ProductFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);
  const [categoryId, setCategoryId] = useState(
    product?.category_id ?? categories.at(0)?.id ?? ""
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();

    const input: ProductInput = {
      title: text("title"),
      short_description: text("short_description"),
      long_description: text("long_description"),
      ingredients: text("ingredients"),
      category_id: categoryId,
      price: Number(text("price")),
      is_available: isAvailable,
      image_url: text("image_url"),
      image_url_2: text("image_url_2"),
      image_url_3: text("image_url_3"),
    };

    startTransition(async () => {
      const result = product
        ? await updateProduct(product.id, input)
        : await createProduct(input);

      if (result.ok) {
        toast.success(product ? "Product updated" : "Product created");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            Unavailable products stay in past orders but disappear from the
            storefront.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                defaultValue={product?.title}
                id="title"
                maxLength={200}
                name="title"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="category_id">Category</Label>
              <Select onValueChange={setCategoryId} value={categoryId}>
                <SelectTrigger id="category_id">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="short_description">Short description</Label>
            <Textarea
              defaultValue={product?.short_description}
              id="short_description"
              maxLength={300}
              name="short_description"
              required
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="long_description">Long description</Label>
            <Textarea
              defaultValue={product?.long_description ?? ""}
              id="long_description"
              maxLength={5000}
              name="long_description"
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ingredients">Ingredients</Label>
            <Textarea
              defaultValue={product?.ingredients ?? ""}
              id="ingredients"
              maxLength={2000}
              name="ingredients"
              rows={2}
            />
          </div>

          <ImageField
            defaultValue={product?.image_url}
            label="Main image"
            name="image_url"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              defaultValue={product?.image_url_2}
              label="Image 2"
              name="image_url_2"
            />
            <ImageField
              defaultValue={product?.image_url_3}
              label="Image 3"
              name="image_url_3"
            />
          </div>

          <div className="flex items-end gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                className="w-40"
                defaultValue={product?.price}
                id="price"
                min={0}
                name="price"
                required
                step="0.01"
                type="number"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={isAvailable}
                id="is_available"
                onCheckedChange={setIsAvailable}
              />
              <Label htmlFor="is_available">Available</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={pending || !categoryId} type="submit">
              {pending ? "Saving..." : "Save product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
