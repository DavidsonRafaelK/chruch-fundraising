import { getCategories } from "@repo/supabase/queries/categories";
import { getOrdersList } from "@repo/supabase/queries/orders";
import { getAdminProductsList } from "@repo/supabase/queries/products";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { formatPrice } from "@repo/ui/format";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PageHeader } from "@/components/page-header";
import {
  RevenueChart,
  RevenueChartLegend,
  type RevenuePoint,
} from "@/components/revenue-chart";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [products, categories, orders] = await Promise.all([
    getAdminProductsList(supabase),
    getCategories(supabase),
    getOrdersList(supabase),
  ]);

  const pendingOrders = orders.filter((order) => order.status === "pending");
  const revenueByMonth = buildRevenueSeries(orders);
  const stats = [
    { label: "Products", value: products.length, href: "/products" },
    {
      label: "Unavailable",
      value: products.filter((product) => !product.is_available).length,
      href: "/products",
    },
    { label: "Categories", value: categories.length, href: "/categories" },
    { label: "Pending orders", value: pendingOrders.length, href: "/orders" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Everything happening in the store right now."
      />

      {/*
       * Stat tiles and the revenue chart share one card surface: the numbers
       * and the trend line describe the same store, so dividers separate
       * them rather than gaps between floating cards.
       */}
      <Card className="gap-0 py-0">
        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x xl:grid-cols-4 xl:divide-y-0">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-muted/60"
            >
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
              <span className="font-heading text-3xl font-bold text-foreground">
                {stat.value}
              </span>
            </Link>
          ))}
        </div>

        <CardHeader className="border-t border-border pt-5">
          <CardTitle>Revenue</CardTitle>
          <CardDescription className="text-xs">
            Last 6 months, cancelled orders excluded.
          </CardDescription>
          <CardAction className="self-center">
            <RevenueChartLegend />
          </CardAction>
        </CardHeader>

        <CardContent className="px-2.5 pt-5 pb-5">
          <RevenueChart data={revenueByMonth} />
        </CardContent>
      </Card>

      <h2 className="mt-10 mb-4 font-heading text-lg font-semibold text-foreground">
        Latest orders
      </h2>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {orders.slice(0, 8).map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">
                        #{order.order_number} · {order.customer_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatPrice(Number(order.total_amount))}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const MONTHS_SHOWN = 6;

/*
 * Builds a fixed six-month window so the axis stays stable even in months
 * with no orders — a gap in the data would otherwise silently disappear and
 * make a quiet month look like a missing one. Cancelled orders never counted
 * as revenue, so they are excluded rather than shown as zero-value sales.
 */
function buildRevenueSeries(
  orders: { created_at: string; total_amount: number; status: string }[],
): RevenuePoint[] {
  const now = new Date();
  const buckets = new Map<string, RevenuePoint>();

  for (let offset = MONTHS_SHOWN - 1; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.set(monthKey(date), {
      month: date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      }),
      revenue: 0,
      orders: 0,
    });
  }

  for (const order of orders) {
    if (order.status === "cancelled") {
      continue;
    }
    const bucket = buckets.get(monthKey(new Date(order.created_at)));
    if (!bucket) {
      continue;
    }
    bucket.revenue += Number(order.total_amount);
    bucket.orders += 1;
  }

  return [...buckets.values()];
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}
