import { ShieldAlertIcon } from "lucide-react";
import { Header } from "../../components/header";

/**
 * Shown when a signed-in admin reaches a root-only page by typing the URL.
 * The nav hides these entries, but hiding is not access control - the pages
 * check as well, and this is what a refusal should look like.
 */
export const RootOnly = ({ page }: { page: string }) => (
  <>
    <Header page={page} pages={["System"]} />
    <div className="flex flex-1 items-center justify-center p-4 pt-0">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
        <div className="rounded-full bg-muted p-3">
          <ShieldAlertIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-medium">Root access required</p>
          <p className="text-muted-foreground text-sm">
            This page is limited to the store owner.
          </p>
        </div>
      </div>
    </div>
  </>
);
