"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cart";

export function AddToCart({
  productId,
  title,
  price,
  imageUrl,
}: {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
}) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  function handleAdd() {
    addItem({ productId, title, price, imageUrl }, quantity);
    toast.success(`Added ${quantity} x ${title} to cart`);
    setQuantity(1);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-border px-2 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Decrease quantity"
          disabled={quantity <= 1}
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        >
          <Minus />
        </Button>
        <span className="w-5 text-center text-sm font-medium">{quantity}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Increase quantity"
          onClick={() => setQuantity((q) => q + 1)}
        >
          <Plus />
        </Button>
      </div>
      <Button size="lg" className="flex-1" onClick={handleAdd}>
        Add to cart
      </Button>
    </div>
  );
}
