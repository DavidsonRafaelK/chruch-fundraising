import { SignOutButton } from "@repo/auth/client";
import { Button } from "@repo/design-system/components/ui/button";
import { ShieldAlertIcon } from "lucide-react";

export const NoAccess = () => (
  <div className="flex min-h-screen items-center justify-center p-6">
    <div className="flex max-w-md flex-col items-center gap-4 text-center">
      <div className="rounded-full bg-muted p-3">
        <ShieldAlertIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-xl">This dashboard is staff-only</h1>
        <p className="text-muted-foreground text-sm">
          Your account is signed in but has no admin role. Ask the store owner
          to grant you access.
        </p>
      </div>
      <SignOutButton>
        <Button variant="outline">Sign out</Button>
      </SignOutButton>
    </div>
  </div>
);
