import { database } from "@repo/database";
import type { Metadata } from "next";
import { Header } from "../components/header";
import { ProductTable } from "./components/product-table";

export const metadata: Metadata = {
  title: "Products",
  description: "Manage the store catalogue.",
};

const ProductsPage = async () => {
  const [products, categories] = await Promise.all([
    database.products.findMany({
      include: { categories: true },
      orderBy: { created_at: "desc" },
    }),
    database.categories.findMany({ orderBy: { sort_order: "asc" } }),
  ]);

  return (
    <>
      <Header page="Products" pages={["Store"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <ProductTable
          categories={categories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
          products={products.map((product) => ({
            id: product.id,
            title: product.title,
            short_description: product.short_description,
            long_description: product.long_description,
            ingredients: product.ingredients,
            category_id: product.category_id,
            category_name: product.categories.name,
            price: product.price.toString(),
            is_available: product.is_available,
            image_url: product.image_url,
            image_url_2: product.image_url_2,
            image_url_3: product.image_url_3,
          }))}
        />
      </div>
    </>
  );
};

export default ProductsPage;
