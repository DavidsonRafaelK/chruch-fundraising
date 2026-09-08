import { database } from "@repo/database";
import type { Metadata } from "next";
import { Header } from "../components/header";
import { CouponTable } from "./components/coupon-table";

export const metadata: Metadata = {
  title: "Coupons",
  description: "Create and manage discount codes.",
};

const CouponsPage = async () => {
  const coupons = await database.coupons.findMany({
    orderBy: { created_at: "desc" },
  });

  return (
    <>
      <Header page="Coupons" pages={["Content"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <CouponTable
          coupons={coupons.map((coupon) => ({
            ...coupon,
            discount_value: coupon.discount_value.toString(),
            min_order_amount: coupon.min_order_amount.toString(),
            max_discount_amount: coupon.max_discount_amount?.toString() ?? null,
            starts_at: coupon.starts_at?.toISOString() ?? null,
            ends_at: coupon.ends_at?.toISOString() ?? null,
          }))}
        />
      </div>
    </>
  );
};

export default CouponsPage;
