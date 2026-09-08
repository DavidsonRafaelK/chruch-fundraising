"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import {
  Loader2Icon,
  MessageCircleIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getQuote, placeOrder, type Quote } from "@/app/actions/checkout";
import { useCart } from "@/lib/cart";

const rupiah = (value: string) =>
  `Rp${Number(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

/**
 * The order is already saved by the time this renders, so the redirect is a
 * convenience rather than part of the transaction. It is delayed briefly so the
 * customer sees their order number, and the button stays as a fallback if the
 * browser blocks the navigation.
 */
const OrderPlaced = ({
  orderNumber,
  whatsappUrl,
}: {
  orderNumber: string;
  whatsappUrl: string | null;
}) => {
  useEffect(() => {
    if (!whatsappUrl) {
      return;
    }

    const timer = setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 2000);

    return () => clearTimeout(timer);
  }, [whatsappUrl]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center sm:p-12">
      <h2 className="font-semibold text-2xl">Order received</h2>
      <p className="text-muted-foreground">
        Your order number is{" "}
        <span className="font-mono font-medium">{orderNumber}</span>.
      </p>

      {whatsappUrl ? (
        <>
          <p className="text-muted-foreground text-sm">
            Taking you to WhatsApp to confirm with us...
          </p>
          <Button asChild size="lg">
            <a href={whatsappUrl}>
              <MessageCircleIcon className="h-4 w-4" /> Confirm on WhatsApp
            </a>
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          We will contact you on the phone number you gave us.
        </p>
      )}

      <Button asChild variant="ghost">
        <Link href="/products">Keep shopping</Link>
      </Button>
    </div>
  );
};

export const Checkout = () => {
  const { lines, ready, setQuantity, remove, clear } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{
    orderNumber: string;
    whatsappUrl: string | null;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Prices always come from the server, never from anything the browser stored.
  useEffect(() => {
    if (!ready || lines.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;

    getQuote(lines, appliedCoupon).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setQuote(result.quote);
        setQuoteError(null);
      } else {
        setQuote(null);
        setQuoteError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lines, appliedCoupon, ready]);

  if (placed) {
    return <OrderPlaced {...placed} />;
  }

  if (!ready) {
    return <p className="text-muted-foreground">Loading your cart...</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-8 text-center sm:p-12">
        <p className="font-medium">Your cart is empty</p>
        <Button asChild variant="outline">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const form = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await placeOrder({
        lines,
        customer: {
          name: String(form.get("name") ?? ""),
          phone: String(form.get("phone") ?? ""),
          note: String(form.get("note") ?? ""),
        },
        couponCode: appliedCoupon,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      clear();
      setPlaced({
        orderNumber: result.orderNumber,
        whatsappUrl: result.whatsappUrl,
      });
    });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
      <div className="flex flex-col gap-4">
        {quoteError && (
          <p className="rounded-lg border border-destructive/50 p-3 text-destructive text-sm">
            {quoteError}
          </p>
        )}

        {(quote?.lines ?? []).map((line) => (
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-4"
            key={line.productId}
          >
            <div className="flex min-w-0 flex-1 basis-full flex-col sm:basis-0">
              <span className="font-medium">{line.title}</span>
              <span className="text-muted-foreground text-sm">
                {rupiah(line.unitPrice)} each
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={() => setQuantity(line.productId, line.quantity - 1)}
                size="icon"
                variant="outline"
              >
                <MinusIcon className="h-4 w-4" />
                <span className="sr-only">Decrease</span>
              </Button>
              <span className="w-8 text-center tabular-nums">
                {line.quantity}
              </span>
              <Button
                onClick={() => setQuantity(line.productId, line.quantity + 1)}
                size="icon"
                variant="outline"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="sr-only">Increase</span>
              </Button>
            </div>
            <span className="ml-auto font-medium tabular-nums sm:ml-0 sm:w-24 sm:text-right">
              {rupiah(line.subtotal)}
            </span>
            <Button
              onClick={() => remove(line.productId)}
              size="icon"
              variant="ghost"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">Remove {line.title}</span>
            </Button>
          </div>
        ))}
      </div>

      <form className="flex h-fit flex-col gap-4 rounded-xl border p-6" onSubmit={submit}>
        <h2 className="font-medium text-lg">Your details</h2>

        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" maxLength={200} name="name" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Phone / WhatsApp</Label>
          <Input id="phone" maxLength={30} name="phone" required />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Textarea id="note" maxLength={1000} name="note" rows={3} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="coupon">Discount code</Label>
          <div className="flex gap-2">
            <Input
              id="coupon"
              maxLength={50}
              onChange={(event) => setCouponInput(event.target.value)}
              placeholder="Optional"
              value={couponInput}
            />
            <Button
              onClick={() =>
                setAppliedCoupon(couponInput.trim() === "" ? null : couponInput.trim())
              }
              type="button"
              variant="outline"
            >
              Apply
            </Button>
          </div>
          {quote?.couponError && (
            <p className="text-destructive text-xs">{quote.couponError}</p>
          )}
          {quote?.couponCode && (
            <p className="text-muted-foreground text-xs">
              {quote.couponCode} applied
            </p>
          )}
        </div>

        <dl className="flex flex-col gap-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">
              {quote ? rupiah(quote.subtotal) : "-"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd className="tabular-nums">
              {quote ? `-${rupiah(quote.discount)}` : "-"}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-1 font-medium text-base">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {quote ? rupiah(quote.total) : "-"}
            </dd>
          </div>
        </dl>

        {submitError && (
          <p className="text-destructive text-sm">{submitError}</p>
        )}

        <Button disabled={pending || !quote} size="lg" type="submit">
          {pending ? (
            <>
              <Loader2Icon className="h-4 w-4 animate-spin" /> Placing order...
            </>
          ) : (
            "Place order"
          )}
        </Button>
      </form>
    </div>
  );
};
