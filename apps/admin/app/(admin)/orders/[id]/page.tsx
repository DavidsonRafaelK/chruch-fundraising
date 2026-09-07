import { getOrderDetail } from "@repo/supabase/queries/orders";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { formatPrice } from "@repo/ui/format";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { OrderStatusControl } from "@/components/order-status-control";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { isUuid } from "@/lib/validation";

export default async function OrderDetailPage({
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
  const order = await getOrderDetail(supabase, id);

  if (!order) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All orders
      </Link>

      <PageHeader
        title={`Order #${order.order_number}`}
        description={new Date(order.created_at).toLocaleString()}
        action={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {order.order_items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">
                      {item.product_name_snapshot}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.quantity} ×{" "}
                      {formatPrice(Number(item.unit_price_snapshot))}
                    </span>
                  </div>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {formatPrice(Number(item.subtotal))}
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium">Total</span>
                <span className="font-heading text-lg font-bold">
                  {formatPrice(Number(order.total_amount))}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="font-heading text-sm font-semibold">Customer</h2>
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-foreground">{order.customer_name}</span>
                <a
                  href={`https://wa.me/${order.customer_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {order.customer_phone}
                </a>
              </div>
              {order.customer_note && (
                <p className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {order.customer_note}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="font-heading text-sm font-semibold">Status</h2>
              <OrderStatusControl orderId={order.id} status={order.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
