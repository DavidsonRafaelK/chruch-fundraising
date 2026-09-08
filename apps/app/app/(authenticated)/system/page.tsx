import { getActor } from "@repo/auth/roles";
import { database } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Metadata } from "next";
import { Header } from "../components/header";
import { RootOnly } from "./components/root-only";

export const metadata: Metadata = {
  title: "System health",
  description: "Database and platform status.",
};

interface Stat {
  label: string;
  value: string;
}

const SystemPage = async () => {
  // Root-only. The nav hides the entry, but a non-root admin could still type
  // the URL, so refuse here with a message rather than an error page.
  const actor = await getActor();

  if (actor?.role !== "root") {
    return <RootOnly page="Health" />;
  }

  const started = Date.now();
  let online = true;
  let stats: Stat[] = [];

  try {
    const [products, categories, orders, banners, coupons, audits] =
      await Promise.all([
        database.products.count(),
        database.categories.count(),
        database.orders.count(),
        database.banners.count(),
        database.coupons.count(),
        database.audit_logs.count(),
      ]);

    stats = [
      { label: "Products", value: products.toLocaleString("id-ID") },
      { label: "Categories", value: categories.toLocaleString("id-ID") },
      { label: "Orders", value: orders.toLocaleString("id-ID") },
      { label: "Banners", value: banners.toLocaleString("id-ID") },
      { label: "Coupons", value: coupons.toLocaleString("id-ID") },
      { label: "Audit entries", value: audits.toLocaleString("id-ID") },
    ];
  } catch {
    online = false;
  }

  const latency = Date.now() - started;

  return (
    <>
      <Header page="Health" pages={["System"]} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Badge variant={online ? "default" : "destructive"}>
            {online ? "Database online" : "Database unreachable"}
          </Badge>
          {online && (
            <span className="text-muted-foreground text-sm">
              Responded in {latency} ms
            </span>
          )}
        </div>

        {online && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div className="rounded-xl border p-4" key={stat.label}>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="font-semibold text-2xl tabular-nums">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SystemPage;
