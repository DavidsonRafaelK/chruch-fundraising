"use client";

import { UserButton } from "@repo/auth/client";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { useEffect, useState } from "react";

/**
 * Renders Clerk's UserButton only after the component has mounted.
 *
 * UserButton attaches itself to the DOM imperatively, so it produces no markup
 * during SSR but real markup on the client. Gating it on ClerkLoaded does not
 * help either: by the time React hydrates, Clerk may already be loaded, so the
 * server picks the loading branch and the client picks the loaded one.
 *
 * `mounted` is false on the server and false on the client's first render, so
 * both sides always agree; the real button swaps in on the effect afterwards.
 */
export const UserMenu = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex w-full items-center gap-2">
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  return (
    <UserButton
      appearance={{
        elements: {
          rootBox: "flex overflow-hidden w-full",
          userButtonBox: "flex-row-reverse",
          userButtonOuterIdentifier: "truncate pl-0",
        },
      }}
      showName
    />
  );
};
