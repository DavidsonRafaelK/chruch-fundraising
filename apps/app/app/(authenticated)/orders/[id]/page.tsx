import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "../../components/header";
import { STATUS_VARIANT } from "../components/status";
import { StatusActions } from "../components/status-actions";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Order",
  description: "Order detail.",
};

const money = (value: { toString: () => string }) =>
  `Rp${Number(value.toString()).toLocaleString("id-ID")}`;

const OrderPage = async ({ params }: OrderPageProps) => {
  const { id } = await params;

  const order = await database.orders.findUnique({
    where: { id },
    include: { order_items: true },
  });

  if (!order) {
    notFound();
  }

  return (
    <>
      <Header page={order.order_number} pages={["Store", "Orders"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-xl">{order.order_number}</h1>
              <Badge variant={STATUS_VARIANT[order.status]}>
                {order.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              {order.created_at.toLocaleString("id-ID")}
            </p>
          </div>
          <StatusActions id={order.id} status={order.status} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border p-4">
            <h2 className="mb-2 font-medium">Customer</h2>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd>{order.customer_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{order.customer_phone}</dd>
              </div>
              {order.customer_note && (
                <div className="flex flex-col gap-1 pt-2">
                  <dt className="text-muted-foreground">Note</dt>
                  <dd className="whitespace-pre-wrap">{order.customer_note}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border p-4">
            <h2 className="mb-2 font-medium">Totals</h2>
            <dl className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{money(order.subtotal_amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">
                  Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}
                </dt>
                <dd className="tabular-nums">
                  -{money(order.discount_amount)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-1 font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">{money(order.total_amount)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.product_name_snapshot}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(item.unit_price_snapshot)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};

export default OrderPage;
