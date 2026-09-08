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
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  type CouponInput,
  createCoupon,
  updateCoupon,
} from "@/app/actions/content/coupons";
import type { CouponRow } from "./coupon-table";

interface CouponFormProps {
  coupon: CouponRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const toLocalInput = (value: string | null): string =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export const CouponForm = ({
  coupon,
  open,
  onOpenChange,
}: CouponFormProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    coupon?.discount_type === "fixed" ? "fixed" : "percent"
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "").trim();
    const numberOrNull = (key: string) => {
      const value = text(key);
      return value === "" ? null : Number(value);
    };
    const date = (key: string) => {
      const value = text(key);
      return value === "" ? null : new Date(value);
    };

    const input: CouponInput = {
      code: text("code"),
      description: text("description"),
      discount_type: discountType,
      discount_value: Number(text("discount_value")),
      max_discount_amount:
        discountType === "percent" ? numberOrNull("max_discount_amount") : null,
      min_order_amount: Number(text("min_order_amount") || 0),
      usage_limit: numberOrNull("usage_limit"),
      starts_at: date("starts_at"),
      ends_at: date("ends_at"),
      is_active: isActive,
    };

    startTransition(async () => {
      const result = coupon
        ? await updateCoupon(coupon.id, input)
        : await createCoupon(input);

      if (result.ok) {
        toast.success(coupon ? "Coupon updated" : "Coupon created");
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
          <DialogTitle>{coupon ? "Edit coupon" : "New coupon"}</DialogTitle>
          <DialogDescription>
            Codes are stored uppercase and apply to the order total.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="code">Code</Label>
            <Input
              className="uppercase"
              defaultValue={coupon?.code}
              id="code"
              maxLength={50}
              name="code"
              placeholder="LEBARAN25"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              defaultValue={coupon?.description ?? ""}
              id="description"
              maxLength={300}
              name="description"
              placeholder="Internal note about this promo"
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="discount_type">Discount type</Label>
              <Select
                onValueChange={(value) =>
                  setDiscountType(value as "percent" | "fixed")
                }
                value={discountType}
              >
                <SelectTrigger id="discount_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="discount_value">
                {discountType === "percent" ? "Percent off" : "Amount off"}
              </Label>
              <Input
                defaultValue={coupon?.discount_value}
                id="discount_value"
                max={discountType === "percent" ? 100 : undefined}
                min={0}
                name="discount_value"
                required
                step="0.01"
                type="number"
              />
            </div>
          </div>

          {discountType === "percent" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="max_discount_amount">
                Maximum discount (optional)
              </Label>
              <Input
                defaultValue={coupon?.max_discount_amount ?? ""}
                id="max_discount_amount"
                min={0}
                name="max_discount_amount"
                placeholder="Cap the rupiah value of this percentage"
                step="0.01"
                type="number"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="min_order_amount">Minimum order</Label>
              <Input
                defaultValue={coupon?.min_order_amount ?? 0}
                id="min_order_amount"
                min={0}
                name="min_order_amount"
                step="0.01"
                type="number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="usage_limit">Usage limit (optional)</Label>
              <Input
                defaultValue={coupon?.usage_limit ?? ""}
                id="usage_limit"
                min={1}
                name="usage_limit"
                placeholder="Unlimited"
                type="number"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="starts_at">Starts at</Label>
              <Input
                defaultValue={toLocalInput(coupon?.starts_at ?? null)}
                id="starts_at"
                name="starts_at"
                type="datetime-local"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ends_at">Ends at</Label>
              <Input
                defaultValue={toLocalInput(coupon?.ends_at ?? null)}
                id="ends_at"
                name="ends_at"
                type="datetime-local"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              id="is_active"
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Active</Label>
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
              {pending ? "Saving..." : "Save coupon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
