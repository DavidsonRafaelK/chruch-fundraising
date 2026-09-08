import { database } from "@repo/database";
import {
  NewArrivalsCarousel,
  NewArrivalsHeader,
} from "./new-arrivals-carousel";

const ARRIVALS_LIMIT = 12;

/**
 * Product data is fetched here and handed to the carousel as plain props, so
 * the presentation component knows nothing about the database.
 */
export const NewArrivals = async () => {
  const products = await database.products
    .findMany({
      where: { is_available: true },
      include: { categories: true },
      orderBy: { created_at: "desc" },
      take: ARRIVALS_LIMIT,
    })
    .catch(() => []);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-background py-12 sm:py-[52px]">
      <NewArrivalsHeader />
      <NewArrivalsCarousel
        products={products.map((product) => ({
          id: product.id,
          title: product.title,
          price: product.price.toString(),
          imageUrl: product.image_url,
          vendor: product.categories.name,
        }))}
      />
    </section>
  );
};
