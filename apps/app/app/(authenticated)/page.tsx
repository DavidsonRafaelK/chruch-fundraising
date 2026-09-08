import { database } from "@repo/database";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { env } from "@/env";
import { WORKSPACE_ID } from "@/lib/workspace";
import { AvatarStack } from "./components/avatar-stack";
import { Cursors } from "./components/cursors";
import { Header } from "./components/header";

const title = "Dashboard";
const description = "My application.";

const CollaborationProvider = dynamic(() =>
  import("./components/collaboration-provider").then(
    (mod) => mod.CollaborationProvider
  )
);

export const metadata: Metadata = {
  title,
  description,
};

const App = async () => {
  const products = await database.products.findMany({
    include: { categories: true },
    orderBy: { created_at: "desc" },
  });
  return (
    <>
      <Header page="Data Fetching" pages={["Building Your Application"]}>
        {env.LIVEBLOCKS_SECRET && (
          <CollaborationProvider workspaceId={WORKSPACE_ID}>
            <AvatarStack />
            <Cursors />
          </CollaborationProvider>
        )}
      </Header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          {products.map((product) => (
            <div
              className="flex flex-col gap-1 rounded-xl bg-muted/50 p-4"
              key={product.id}
            >
              <span className="font-medium">{product.title}</span>
              <span className="text-muted-foreground text-sm">
                {product.categories.name}
              </span>
              <span className="text-sm">{product.price.toString()}</span>
            </div>
          ))}
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
};

export default App;
