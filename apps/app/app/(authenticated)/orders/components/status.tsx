import type { ComponentProps } from "react";
import type { Badge } from "@repo/design-system/components/ui/badge";

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

export const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: "secondary",
  confirmed: "default",
  ready: "default",
  completed: "outline",
  cancelled: "destructive",
};
