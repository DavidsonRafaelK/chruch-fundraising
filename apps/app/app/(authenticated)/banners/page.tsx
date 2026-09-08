import { database } from "@repo/database";
import type { Metadata } from "next";
import { Header } from "../components/header";
import { BannerTable } from "./components/banner-table";

export const metadata: Metadata = {
  title: "Banners",
  description: "Manage the banners shown on the storefront hero section.",
};

const BannersPage = async () => {
  const banners = await database.banners.findMany({
    orderBy: [{ sort_order: "asc" }, { created_at: "desc" }],
  });

  return (
    <>
      <Header page="Banners" pages={["Content"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <BannerTable
          banners={banners.map((banner) => ({
            ...banner,
            starts_at: banner.starts_at?.toISOString() ?? null,
            ends_at: banner.ends_at?.toISOString() ?? null,
          }))}
        />
      </div>
    </>
  );
};

export default BannersPage;
