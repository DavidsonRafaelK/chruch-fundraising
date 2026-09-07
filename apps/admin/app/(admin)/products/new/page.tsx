import { getCategories } from "@repo/supabase/queries/categories";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";

export default async function NewProductPage() {
  await requireAdmin();

  const supabase = await createClient();
  const categories = await getCategories(supabase);

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
        title="New product"
        description="Add an item to the storefront catalogue."
      />

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create a category first — every product belongs to one.
        </p>
      ) : (
        <ProductForm categories={categories} />
      )}
    </div>
  );
}
