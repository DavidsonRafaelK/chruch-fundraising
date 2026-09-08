"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import {
  PencilIcon,
  PlusIcon,
  TicketPercentIcon,
  TrashIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCoupon } from "@/app/actions/content/coupons";
import { ConfirmDelete } from "../../components/confirm-delete";
import { CouponForm } from "./coupon-form";

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: string;
  max_discount_amount: string | null;
  min_order_amount: string;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

const formatDiscount = (row: CouponRow): string =>
  row.discount_type === "percent"
    ? `${Number(row.discount_value)}%`
    : `Rp${Number(row.discount_value).toLocaleString("id-ID")}`;

type Status = { label: string; live: boolean };

const getStatus = (row: CouponRow): Status => {
  const now = Date.now();

  if (!row.is_active) {
    return { label: "Inactive", live: false };
  }
  if (row.usage_limit !== null && row.used_count >= row.usage_limit) {
    return { label: "Used up", live: false };
  }
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) {
    return { label: "Expired", live: false };
  }
  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    return { label: "Scheduled", live: false };
  }

  return { label: "Live", live: true };
};

export const CouponTable = ({ coupons }: { coupons: CouponRow[] }) => {
  const router = useRouter();
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<CouponRow | null>(null);
  const [pending, startTransition] = useTransition();

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: CouponRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  const confirmDelete = () => {
    if (!deleting) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCoupon(deleting.id);

      if (result.ok) {
        toast.success("Coupon deleted");
        setDeleting(null);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openNew} size="sm">
          <PlusIcon className="h-4 w-4" /> New coupon
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <TicketPercentIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-medium">No coupons yet</p>
            <p className="text-muted-foreground text-sm">
              Create a code customers can redeem at checkout.
            </p>
          </div>
          <Button onClick={openNew} size="sm" variant="outline">
            <PlusIcon className="h-4 w-4" /> New coupon
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Minimum</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((row) => {
                const status = getStatus(row);

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium font-mono">
                          {row.code}
                        </span>
                        {row.description && (
                          <span className="line-clamp-1 text-muted-foreground text-xs">
                            {row.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatDiscount(row)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(row.min_order_amount) === 0
                        ? "-"
                        : `Rp${Number(row.min_order_amount).toLocaleString("id-ID")}`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.used_count}
                      {row.usage_limit === null ? "" : ` / ${row.usage_limit}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.live ? "default" : "secondary"}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          onClick={() => openEdit(row)}
                          size="icon"
                          variant="ghost"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span className="sr-only">Edit {row.code}</span>
                        </Button>
                        <Button
                          onClick={() => setDeleting(row)}
                          size="icon"
                          variant="ghost"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span className="sr-only">Delete {row.code}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {formOpen && (
        <CouponForm
          coupon={editing}
          key={editing?.id ?? "new"}
          onOpenChange={setFormOpen}
          open={formOpen}
        />
      )}

      <ConfirmDelete
        description={`Coupon "${deleting?.code}" will stop working immediately. This cannot be undone.`}
        onConfirm={confirmDelete}
        onOpenChange={(open) => !open && setDeleting(null)}
        open={deleting !== null}
        pending={pending}
        title="Delete coupon?"
      />
    </div>
  );
};
