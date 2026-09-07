import { getCategories } from "@repo/supabase/queries/categories";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { isUuid } from "@/lib/validation";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }

  const supabase = await createClient();
  /*
   * Read straight from the table rather than through the storefront's
   * getProductDetail: the form needs every column it writes back, including
   * the ones that query trims away.
   */
  const [{ data: product }, categories] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    getCategories(supabase),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All products
      </Link>

      <PageHeader
        title={product.title}
        description="Edit the details customers see in the storefront."
      />

      <ProductForm product={product} categories={categories} />
    </div>
  );
}
