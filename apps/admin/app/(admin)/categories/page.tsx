import { getCategories } from "@repo/supabase/queries/categories";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { CategoryManager } from "@/components/category-manager";
import { PageHeader } from "@/components/page-header";

export default async function CategoriesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const categories = await getCategories(supabase);

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group products for the storefront filter. Categories with ingredients show an ingredients section on the product page."
      />
      <CategoryManager categories={categories} />
    </div>
  );
}
