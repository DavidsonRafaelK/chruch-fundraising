"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createOrderAction } from "@/app/checkout/actions";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@repo/ui/format";
import { cartSubtotal, useCartStore } from "@/lib/store/cart";

type SuccessState = { orderNumber: string; whatsappUrl: string };

export function CheckoutForm() {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clear);
  const subtotal = cartSubtotal(items);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [isPending, startTransition] = useTransition();

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="font-heading text-xl font-semibold text-foreground">
          Order {success.orderNumber} confirmed!
        </h1>
        <p className="text-sm text-muted-foreground">
          Opening WhatsApp to finish up with us…
        </p>
        <a
          href={success.whatsappUrl}
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          If WhatsApp didn&apos;t open, tap here
        </a>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Button render={<Link href="/" />} nativeButton={false}>
          Browse products
        </Button>
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!turnstileToken || isPending) {
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createOrderAction({
        customerName,
        customerPhone,
        customerNote: customerNote || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        turnstileToken,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      clearCart();
      setSuccess({
        orderNumber: result.orderNumber,
        whatsappUrl: result.whatsappUrl,
      });
      window.location.href = result.whatsappUrl;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-medium text-foreground">
          Order summary
        </h2>
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.productId}
              className="flex justify-between text-sm text-muted-foreground"
            >
              <span>
                {item.quantity} × {item.title}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold text-foreground">
          <span>Estimated total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Final total is confirmed when you place the order.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerName">Name</Label>
          <Input
            id="customerName"
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerPhone">Phone</Label>
          <Input
            id="customerPhone"
            type="tel"
            required
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customerNote">Note (optional)</Label>
          <Textarea
            id="customerNote"
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
          />
        </div>

        <TurnstileWidget onVerify={setTurnstileToken} />

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={!turnstileToken || isPending}>
          {isPending ? "Placing order…" : "Confirm order"}
        </Button>
      </form>
    </div>
  );
}
