import { auth, currentUser } from "@repo/auth/server";
import { getActor } from "@repo/auth/roles";
import { getStoreName } from "@repo/database/settings";
import { SidebarProvider } from "@repo/design-system/components/ui/sidebar";
import { showBetaFeature } from "@repo/feature-flags";
import { secure } from "@repo/security";
import type { ReactNode } from "react";
import { env } from "@/env";
import { NotificationsProvider } from "./components/notifications-provider";
import { NoAccess } from "./components/no-access";
import { GlobalSidebar } from "./components/sidebar";

interface AppLayoutProperties {
  readonly children: ReactNode;
}

const AppLayout = async ({ children }: AppLayoutProperties) => {
  if (env.ARCJET_KEY) {
    await secure(["CATEGORY:PREVIEW"]);
  }

  const user = await currentUser();
  const { redirectToSignIn } = await auth();
  const betaFeature = await showBetaFeature();
  const storeName = await getStoreName();

  if (!user) {
    return redirectToSignIn();
  }

  // Signing in is not enough: the dashboard is staff-only. Customers never
  // need an account, so anyone without an admin role is turned away here.
  const actor = await getActor();

  if (!actor) {
    return <NoAccess />;
  }

  return (
    <NotificationsProvider userId={user.id}>
      <SidebarProvider>
        <GlobalSidebar role={actor.role} storeName={storeName}>
          {betaFeature && (
            <div className="m-4 rounded-full bg-blue-500 p-1.5 text-center text-sm text-white">
              Beta feature now available
            </div>
          )}
          {children}
        </GlobalSidebar>
      </SidebarProvider>
    </NotificationsProvider>
  );
};

export default AppLayout;
