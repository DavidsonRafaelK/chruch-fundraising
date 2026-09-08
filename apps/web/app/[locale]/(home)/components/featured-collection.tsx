import { database } from "@repo/database";
import Link from "next/link";
import { ProductCard } from "../../components/product-card";

const FEATURED_LIMIT = 6;

/**
 * The intro and the product grid are separate blocks, not cells of one shared
 * grid. That is what makes product 4 start under product 1 rather than
 * wrapping beneath the intro column.
 */
export const FeaturedCollection = async () => {
  const products = await database.products
    .findMany({
      where: { is_available: true },
      include: { categories: true },
      orderBy: { created_at: "desc" },
      take: FEATURED_LIMIT,
    })
    .catch(() => []);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-background">
      <div className="mx-auto flex max-w-[1560px] flex-col gap-8 px-5 py-12 sm:px-6 sm:py-16 lg:flex-row lg:gap-8 lg:px-12">
        <div className="w-full shrink-0 lg:max-w-[460px]">
          <h2 className="font-[family-name:var(--font-serif-display)] font-bold text-3xl leading-[1.05] tracking-tight sm:text-4xl lg:text-[50px]">
            Featured collection
          </h2>
          <p className="mt-4 max-w-[430px] text-base text-muted-foreground leading-[1.4] sm:text-[19px]">
            Explore our top picks in this featured collection. Find the perfect
            gift or treat yourself!
          </p>
          <Link
            className="mt-7 inline-flex h-[52px] items-center justify-center rounded-full bg-foreground px-8 font-semibold text-background text-base transition-opacity hover:opacity-90 sm:mt-9 sm:h-[56px] sm:px-9"
            href="/products"
          >
            View more
          </Link>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-x-[18px] gap-y-8 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={{
                id: product.id,
                title: product.title,
                price: product.price.toString(),
                imageUrl: product.image_url,
                vendor: product.categories.name,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
