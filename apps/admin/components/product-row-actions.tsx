"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct } from "@/app/(admin)/products/actions";
import { Button } from "@/components/ui/button";

export function ProductRowActions({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /*
   * Two-step confirm rather than a dialog: deleting also destroys the
   * product's photos, so the destructive click must never be one stray tap
   * away — but a whole modal for a row action is more machinery than the
   * decision needs.
   */
  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Delete?</span>
        <Button
          type="button"
          size="icon-sm"
          variant="destructive"
          aria-label={`Confirm deleting ${title}`}
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await deleteProduct(id);
              if (!result.success) {
                setError(result.error);
                setConfirming(false);
                return;
              }
              router.refresh();
            });
          }}
        >
          <Check />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Cancel"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-1 text-xs text-destructive">{error}</span>}
      <Button
        render={<Link href={`/products/${id}`} />}
        nativeButton={false}
        size="icon-sm"
        variant="ghost"
        aria-label={`Edit ${title}`}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Delete ${title}`}
        onClick={() => setConfirming(true)}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
