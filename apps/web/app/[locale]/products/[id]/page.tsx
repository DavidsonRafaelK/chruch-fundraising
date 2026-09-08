import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { cn } from "@repo/design-system/lib/utils";
import { createStoreMetadata } from "@/lib/metadata";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatIDR } from "@/lib/money";
import { AddToCart } from "../components/add-to-cart";

interface ProductPageProps {
  readonly params: Promise<{ id: string }>;
}

const findProduct = async (id: string) => {
  // The id comes from the URL, so a malformed one must 404 rather than throw.
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return null;
  }

  return database.products.findUnique({
    where: { id },
    include: { categories: true },
  });
};

export const generateMetadata = async ({
  params,
}: ProductPageProps): Promise<Metadata> => {
  const { id } = await params;
  const product = await findProduct(id);

  if (!product) {
    return {};
  }

  return createStoreMetadata({
    title: product.title,
    description: product.short_description,
  });
};

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  const product = await findProduct(id);

  if (!product) {
    notFound();
  }

  const images = [
    product.image_url,
    product.image_url_2,
    product.image_url_3,
  ].filter((image): image is string => Boolean(image));

  return (
    <div className="container mx-auto px-5 py-12 sm:px-6 sm:py-16">
      <Link
        className="mb-8 inline-flex items-center gap-1 text-muted-foreground text-sm hover:underline"
        href="/products"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        All products
      </Link>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Extra shots sit two-up on phones so the page does not become a
            column of full-width images. */}
        <div className="grid grid-cols-2 gap-3">
          {images.map((image, index) => (
            <div
              className={cn(
                "overflow-hidden rounded-xl bg-muted",
                index === 0 && "col-span-2"
              )}
              // biome-ignore lint/suspicious/noArrayIndexKey: image urls may repeat
              key={index}
            >
              {/* biome-ignore lint/performance/noImgElement: images come from arbitrary hosts */}
              <img
                alt={product.title}
                className="aspect-square w-full object-cover"
                src={image}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Badge className="w-fit" variant="outline">
              {product.categories.name}
            </Badge>
            <h1 className="font-regular text-3xl tracking-tighter sm:text-4xl md:text-5xl">
              {product.title}
            </h1>
            <p className="text-lg text-muted-foreground">
              {product.short_description}
            </p>
            <p className="font-semibold text-3xl">
              {formatIDR(product.price.toString())}
            </p>
          </div>

          <AddToCart
            available={product.is_available}
            className="w-full sm:w-auto"
            productId={product.id}
            size="lg"
          />

          {product.long_description && (
            <div className="flex flex-col gap-2">
              <h2 className="font-medium">Description</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {product.long_description}
              </p>
            </div>
          )}

          {product.ingredients && (
            <div className="flex flex-col gap-2">
              <h2 className="font-medium">Ingredients</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {product.ingredients}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
