import { createStoreMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import { Checkout } from "./components/checkout";

export const generateMetadata = async (): Promise<Metadata> =>
  createStoreMetadata({
    title: "Cart",
    description: "Review your order and check out.",
  });

const CartPage = () => (
  <div className="container mx-auto px-5 py-12 sm:px-6 sm:py-16">
    <h1 className="mb-8 font-regular text-3xl tracking-tighter sm:text-4xl md:text-5xl">
      Your cart
    </h1>
    <Checkout />
  </div>
);

export default CartPage;
