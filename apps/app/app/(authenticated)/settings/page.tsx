import { database } from "@repo/database";
import { DEFAULT_STORE_NAME } from "@repo/database/settings";
import type { Metadata } from "next";
import { Header } from "../components/header";
import { SettingsForm } from "./components/settings-form";

export const metadata: Metadata = {
  title: "Settings",
  description: "Store name, contact and legal pages.",
};

/** Slugs the storefront always links to, so both are offered even when unset. */
const LEGAL_SLUGS = ["privacy", "terms"] as const;

const text = (value: unknown, key: string): string => {
  const field = (value as Record<string, unknown> | null)?.[key];

  return typeof field === "string" ? field : "";
};

const SettingsPage = async () => {
  const settings = await database.site_settings.findMany();
  const byKey = new Map(settings.map((setting) => [setting.key, setting.value]));

  const storeName =
    text(byKey.get("store.name"), "value") || DEFAULT_STORE_NAME;

  return (
    <>
      <Header page="Settings" pages={["Content"]} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <SettingsForm
          legal={LEGAL_SLUGS.map((slug) => ({
            slug,
            title: text(byKey.get(`legal.${slug}`), "title"),
            description: text(byKey.get(`legal.${slug}`), "description"),
            body: text(byKey.get(`legal.${slug}`), "body"),
          }))}
          storeName={storeName}
          whatsapp={text(byKey.get("store.whatsapp"), "number")}
        />
      </div>
    </>
  );
};

export default SettingsPage;
