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
import { ShoppingCartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/header";
import { STATUS_VARIANT } from "./components/status";

export const metadata: Metadata = {
  title: "Orders",
  description: "Incoming customer orders.",
};

const OrdersPage = async () => {
  const orders = await database.orders.findMany({
    include: { _count: { select: { order_items: true } } },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <>
      <Header page="Orders" pages={["Store"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <ShoppingCartIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm">
                Orders placed on the storefront show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        className="font-medium font-mono hover:underline"
                        href={`/orders/${order.id}`}
                      >
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{order.customer_name}</span>
                        <span className="text-muted-foreground text-xs">
                          {order.customer_phone}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order._count.order_items}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      Rp{Number(order.total_amount).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[order.status]}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.created_at.toLocaleString("id-ID")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
};

export default OrdersPage;
