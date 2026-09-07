import { getProductDetail } from "@repo/supabase/queries/products";
import { createClient } from "@repo/supabase/server";
import { ChevronDown } from "lucide-react";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";
import { formatPrice } from "@repo/ui/format";
import { isUuid } from "@/lib/validation";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const supabase = await createClient();
  const product = await getProductDetail(supabase, id);

  if (!product) {
    notFound();
  }

  const images = [
    product.image_url,
    product.image_url_2,
    product.image_url_3,
  ].filter((url): url is string => Boolean(url));

  const hasIngredients =
    product.categories?.has_ingredients && product.ingredients;

  return (
    <div className="grid gap-8 py-8 md:grid-cols-2 md:gap-12">
      <ProductGallery images={images} alt={product.title} />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {product.title}
          </h1>
          <p className="text-2xl font-semibold text-foreground">
            {formatPrice(product.price)}
          </p>
        </div>

        <AddToCart
          productId={product.id}
          title={product.title}
          price={product.price}
          imageUrl={product.image_url}
        />

        <div className="flex flex-col gap-4 border-t border-border pt-6">
          <p className="text-foreground">{product.short_description}</p>
          {product.long_description && (
            <p className="text-muted-foreground">{product.long_description}</p>
          )}
        </div>

        {hasIngredients && (
          /*
           * A native <details> keeps the disclosure keyboard- and
           * screen-reader-accessible without pulling in an accordion
           * component for the page's only collapsible section.
           */
          <details className="group border-t border-border pt-6">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium tracking-widest text-muted-foreground uppercase">
              Ingredients
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-muted-foreground">{product.ingredients}</p>
          </details>
        )}
      </div>
    </div>
  );
}
