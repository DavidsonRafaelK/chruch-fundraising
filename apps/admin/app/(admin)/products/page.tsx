import { getAdminProductsList } from "@repo/supabase/queries/products";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { formatPrice } from "@repo/ui/format";
import { Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProductRowActions } from "@/components/product-row-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProductsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const products = await getAdminProductsList(supabase);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Everything in the catalogue, including items hidden from the storefront."
        action={
          <Button render={<Link href="/products/new" />} nativeButton={false}>
            <Plus />
            New product
          </Button>
        }
      />

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 text-right font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {product.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {product.short_description}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {product.categories?.name ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium whitespace-nowrap">
                      {formatPrice(Number(product.price))}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={product.is_available ? "secondary" : "outline"}
                      >
                        {product.is_available ? "Available" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <ProductRowActions
                        id={product.id}
                        title={product.title}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
