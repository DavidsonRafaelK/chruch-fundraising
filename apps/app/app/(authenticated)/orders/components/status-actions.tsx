"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { STATUS_FLOW, updateOrderStatus } from "@/app/actions/content/orders";

interface StatusActionsProps {
  id: string;
  status: string;
}

export const StatusActions = ({ id, status }: StatusActionsProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next = STATUS_FLOW[status] ?? [];

  if (next.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        This order is {status} and can no longer change.
      </p>
    );
  }

  const move = (target: string) => {
    startTransition(async () => {
      const result = await updateOrderStatus(id, target);

      if (result.ok) {
        toast.success(`Order marked ${target}`);
        router.refresh();
        return;
      }

      toast.error(result.error);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((target) => (
        <Button
          disabled={pending}
          key={target}
          onClick={() => move(target)}
          variant={target === "cancelled" ? "outline" : "default"}
        >
          Mark {target}
        </Button>
      ))}
    </div>
  );
};
