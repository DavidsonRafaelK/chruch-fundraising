import { Badge } from "@/components/ui/badge";

/*
 * Mirrors the status values allowed by the check constraint on
 * public.orders.status in database/schema.sql.
 */
const VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  confirmed: "secondary",
  ready: "secondary",
  completed: "default",
  cancelled: "destructive",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}
