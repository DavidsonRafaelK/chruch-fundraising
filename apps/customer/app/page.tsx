import { getCategories } from "@repo/supabase/queries/categories";
import { getProductListing } from "@repo/supabase/queries/products";
import { createClient } from "@repo/supabase/server";
import { CategoryFilter } from "@/components/category-filter";
import { Hero, type HeroSlide } from "@/components/hero";
import { NewArrivals } from "@/components/new-arrivals";
import { ProductCard } from "@/components/product-card";
import { isUuid } from "@/lib/validation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  /*
   * The query string is user-controlled, so an unrecognised value is treated
   * as "no filter" rather than passed through to the database.
   */
  const categoryId = isUuid(category) ? category : undefined;

  const supabase = await createClient();
  const [categories, products] = await Promise.all([
    getCategories(supabase),
    getProductListing(supabase, { categoryId }),
  ]);

  const activeCategory = categories.find((item) => item.id === categoryId);

  /*
   * The hero doubles as a showcase of the newest arrivals — `getProductListing`
   * already returns newest-first, so the slides are the head of that list
   * rather than a second query or a separate banner table to maintain.
   */
  /*
   * `is_new` is the DB-computed "created within 14 days" flag, so the strip
   * empties itself as products age instead of always showing the newest N.
   */
  const newArrivals = products.filter((product) => product.is_new);

  const heroSlides: HeroSlide[] = products.slice(0, 3).map((product) => ({
    id: product.id,
    title: product.title,
    description: product.short_description,
    imageUrl: product.image_url,
    href: `/product/${product.id}`,
  }));

  return (
    <div className="flex flex-col gap-10 pb-12">
      <Hero slides={heroSlides} />

      <NewArrivals products={newArrivals} />

      <CategoryFilter categories={categories} activeCategoryId={categoryId} />

      <section
        id="catalog"
        className="grid scroll-mt-24 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-12"
      >
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {activeCategory?.name ?? "Featured collection"}
          </h2>
          <p className="text-pretty text-muted-foreground">
            Explore our top picks in this featured collection. Find the perfect
            gift or treat yourself!
          </p>
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No products available right now. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
