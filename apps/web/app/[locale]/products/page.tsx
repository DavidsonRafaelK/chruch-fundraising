import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { createStoreMetadata } from "@/lib/metadata";
import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "../components/product-card";
import { AddToCart } from "./components/add-to-cart";

export const generateMetadata = async (): Promise<Metadata> =>
  createStoreMetadata({
    title: "Products",
    description: "Browse everything we make.",
  });

interface ProductsPageProps {
  readonly searchParams: Promise<{ category?: string }>;
}

const ProductsPage = async ({ searchParams }: ProductsPageProps) => {
  const { category } = await searchParams;

  const [categories, products] = await Promise.all([
    database.categories.findMany({ orderBy: { sort_order: "asc" } }),
    database.products.findMany({
      where: {
        is_available: true,
        ...(category ? { categories: { name: category } } : {}),
      },
      include: { categories: true },
      orderBy: { created_at: "desc" },
    }),
  ]);

  return (
    <div className="container mx-auto px-5 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-regular text-3xl tracking-tighter sm:text-4xl md:text-5xl">
          Products
        </h1>
        <p className="text-muted-foreground">
          {products.length} item{products.length === 1 ? "" : "s"} available
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/products">
          <Badge variant={category ? "outline" : "default"}>All</Badge>
        </Link>
        {categories.map((item) => (
          <Link
            href={`/products?category=${encodeURIComponent(item.name)}`}
            key={item.id}
          >
            <Badge variant={category === item.name ? "default" : "outline"}>
              {item.name}
            </Badge>
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-muted-foreground">
          Nothing here yet. Check back soon.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div className="flex flex-col gap-3" key={product.id}>
              <ProductCard
                product={{
                  id: product.id,
                  title: product.title,
                  price: product.price.toString(),
                  imageUrl: product.image_url,
                  vendor: product.categories.name,
                }}
              />
              <AddToCart
                available={product.is_available}
                productId={product.id}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
