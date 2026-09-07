import { getOrdersList } from "@repo/supabase/queries/orders";
import { requireAdmin } from "@repo/supabase/require-admin";
import { createClient } from "@repo/supabase/server";
import { formatPrice } from "@repo/ui/format";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function OrdersPage() {
  await requireAdmin();

  const supabase = await createClient();
  const orders = await getOrdersList(supabase);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order placed through the storefront, newest first."
      />

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Placed</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        #{order.order_number}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-foreground">
                        {order.customer_name}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_phone}
                      </p>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right font-medium whitespace-nowrap">
                      {formatPrice(Number(order.total_amount))}
                    </td>
                    <td className="px-5 py-3">
                      <OrderStatusBadge status={order.status} />
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
