import { CheckoutForm } from "@/components/checkout-form";

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="font-heading text-xl font-semibold text-foreground">
        Checkout
      </h1>
      <div className="mt-4">
        <CheckoutForm />
      </div>
    </div>
  );
}
