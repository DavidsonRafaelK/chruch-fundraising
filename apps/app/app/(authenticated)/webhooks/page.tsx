import { webhooks } from "@repo/webhooks";
import { WebhookIcon } from "lucide-react";
import { WORKSPACE_ID } from "@/lib/workspace";
import { Header } from "../components/header";

export const metadata = {
  title: "Webhooks",
  description: "Send webhooks to your users.",
};

const WebhooksPage = async () => {
  const response = await webhooks.getAppPortal(WORKSPACE_ID);

  if (!response?.url) {
    return (
      <>
        <Header page="Webhooks" pages={["System"]} />
        <div className="flex flex-1 items-center justify-center p-4 pt-0">
          <div className="flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
            <div className="rounded-full bg-muted p-3">
              <WebhookIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-medium">Webhooks are not configured</p>
              <p className="text-muted-foreground text-sm">
                Set <code className="font-mono">SVIX_TOKEN</code> in{" "}
                <code className="font-mono">apps/app/.env.local</code> to manage
                webhook endpoints from here.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <iframe
        allow="clipboard-write"
        className="h-full w-full border-none"
        loading="lazy"
        src={response.url}
        title="Webhooks"
      />
    </div>
  );
};

export default WebhooksPage;
