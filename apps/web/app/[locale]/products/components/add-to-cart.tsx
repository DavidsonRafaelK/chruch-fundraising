"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { CheckIcon, ShoppingCartIcon } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";

interface AddToCartProps {
  productId: string;
  available: boolean;
  className?: string;
  size?: "sm" | "lg" | "default";
}

export const AddToCart = ({
  productId,
  available,
  className,
  size = "default",
}: AddToCartProps) => {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  if (!available) {
    return (
      <Button className={className} disabled size={size} variant="secondary">
        Sold out
      </Button>
    );
  }

  const handleClick = () => {
    add(productId);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Button className={className} onClick={handleClick} size={size}>
      {added ? (
        <>
          <CheckIcon className="h-4 w-4" /> Added
        </>
      ) : (
        <>
          <ShoppingCartIcon className="h-4 w-4" /> Add to cart
        </>
      )}
    </Button>
  );
};
