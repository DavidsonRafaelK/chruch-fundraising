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
import { Switch } from "@repo/design-system/components/ui/switch";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { ImageField } from "../../components/image-field";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type BannerInput,
  createBanner,
  updateBanner,
} from "@/app/actions/content/banners";
import type { BannerRow } from "./banner-table";

interface BannerFormProps {
  banner: BannerRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** datetime-local needs `YYYY-MM-DDTHH:mm`, not a full ISO string. */
const toLocalInput = (value: string | null): string =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export const BannerForm = ({
  banner,
  open,
  onOpenChange,
}: BannerFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const date = (key: string) => {
      const value = text(key);
      return value === "" ? null : new Date(value);
    };

    const input: BannerInput = {
      title: text("title"),
      subtitle: text("subtitle"),
      image_url: text("image_url"),
      link_url: text("link_url"),
      link_label: text("link_label"),
      sort_order: Number(text("sort_order") || 0),
      is_active: isActive,
      starts_at: date("starts_at"),
      ends_at: date("ends_at"),
    };

    startTransition(async () => {
      const result = banner
        ? await updateBanner(banner.id, input)
        : await createBanner(input);

      if (result.ok) {
        toast.success(banner ? "Banner updated" : "Banner created");
        onOpenChange(false);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{banner ? "Edit banner" : "New banner"}</DialogTitle>
          <DialogDescription>
            Banners appear in the storefront hero section, ordered by position.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              defaultValue={banner?.title}
              id="title"
              maxLength={200}
              name="title"
              placeholder="Fresh bakes every morning"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Textarea
              defaultValue={banner?.subtitle ?? ""}
              id="subtitle"
              maxLength={500}
              name="subtitle"
              placeholder="Optional supporting line"
              rows={2}
            />
          </div>

          <ImageField
            defaultValue={banner?.image_url}
            label="Image"
            name="image_url"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="link_url">Link URL</Label>
              <Input
                defaultValue={banner?.link_url ?? ""}
                id="link_url"
                name="link_url"
                placeholder="/products"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="link_label">Link label</Label>
              <Input
                defaultValue={banner?.link_label ?? ""}
                id="link_label"
                maxLength={100}
                name="link_label"
                placeholder="Shop now"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="starts_at">Starts at</Label>
              <Input
                defaultValue={toLocalInput(banner?.starts_at ?? null)}
                id="starts_at"
                name="starts_at"
                type="datetime-local"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ends_at">Ends at</Label>
              <Input
                defaultValue={toLocalInput(banner?.ends_at ?? null)}
                id="ends_at"
                name="ends_at"
                type="datetime-local"
              />
            </div>
          </div>

          <div className="flex items-end gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sort_order">Position</Label>
              <Input
                className="w-24"
                defaultValue={banner?.sort_order ?? 0}
                id="sort_order"
                min={0}
                name="sort_order"
                type="number"
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                checked={isActive}
                id="is_active"
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active">Active</Label>
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
            <Button disabled={pending} type="submit">
              {pending ? "Saving..." : "Save banner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
