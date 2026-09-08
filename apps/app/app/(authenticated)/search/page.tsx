import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { Header } from "../components/header";

interface SearchPageProperties {
  searchParams: Promise<{
    q: string;
  }>;
}

export const generateMetadata = async ({
  searchParams,
}: SearchPageProperties) => {
  const { q } = await searchParams;

  return {
    title: `${q} - Search results`,
    description: `Search results for ${q}`,
  };
};

const SearchPage = async ({ searchParams }: SearchPageProperties) => {
  const { q } = await searchParams;
  const products = await database.products.findMany({
    where: {
      title: {
        contains: q,
        mode: "insensitive",
      },
    },
    include: { categories: true },
  });
  if (!q) {
    redirect("/");
  }

  return (
    <>
      <Header page="Search" pages={["Building Your Application"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {products.map((product) => (
            <div
              className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4"
              key={product.id}
            >
              <span className="font-medium">{product.title}</span>
              <span className="text-muted-foreground text-sm">
                {product.categories.name}
              </span>
            </div>
          ))}
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};

export default SearchPage;
