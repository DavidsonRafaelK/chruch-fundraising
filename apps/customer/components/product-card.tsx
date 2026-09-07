import type { ProductListingRow } from "@repo/supabase/queries/products";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@repo/ui/format";

export function ProductCard({ product }: { product: ProductListingRow }) {
  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {product.is_new && (
          <Badge className="absolute top-3 left-3" variant="default">
            New
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground">
          {product.title}
        </h3>
        {product.categories?.name && (
          <span className="text-sm text-muted-foreground">
            {product.categories.name}
          </span>
        )}
        <span className="mt-1 text-sm font-semibold text-foreground">
          {formatPrice(product.price)}
        </span>
      </div>
    </Link>
  );
}
