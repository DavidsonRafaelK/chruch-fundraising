import Link from "next/link";
import { formatIDR } from "@/lib/money";

export interface ProductCardData {
  id: string;
  title: string;
  price: string;
  imageUrl: string;
  /** Shown under the title - the category reads as the vendor line. */
  vendor?: string | null;
  /** Original price when the product is discounted; struck through if set. */
  compareAtPrice?: string | null;
}

/**
 * Deliberately has no card: no background, border or shadow. Only the image is
 * rounded, so the photography carries the section and every card lines up.
 */
export const ProductCard = ({ product }: { product: ProductCardData }) => (
  <div className="flex flex-col">
    <Link
      className="overflow-hidden rounded-xl bg-neutral-100"
      href={`/products/${product.id}`}
    >
      {/* biome-ignore lint/performance/noImgElement: images come from arbitrary hosts */}
      <img
        alt={product.title}
        className="aspect-[5/6] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
        loading="lazy"
        src={product.imageUrl}
      />
    </Link>

    <div className="mt-3 flex flex-col gap-1">
      <Link href={`/products/${product.id}`}>
        <h3 className="font-semibold text-[17px] leading-tight tracking-tight hover:underline">
          {product.title}
        </h3>
      </Link>

      {product.vendor && (
        <p className="text-muted-foreground text-sm">{product.vendor}</p>
      )}

      <p className="mt-1 flex items-baseline gap-2 font-bold text-base">
        {product.compareAtPrice && (
          <span className="font-normal text-muted-foreground line-through">
            {formatIDR(product.compareAtPrice)}
          </span>
        )}
        <span>{formatIDR(product.price)}</span>
      </p>
    </div>
  </div>
);
