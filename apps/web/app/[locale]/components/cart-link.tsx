"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { ShoppingCartIcon } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/lib/cart";

export const CartLink = () => {
  const { count, ready } = useCart();

  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/cart">
        <ShoppingCartIcon className="h-4 w-4" />
        Cart
        {/* Only after mount: the count is unknown during SSR. */}
        {ready && count > 0 && <span className="tabular-nums">({count})</span>}
      </Link>
    </Button>
  );
};
