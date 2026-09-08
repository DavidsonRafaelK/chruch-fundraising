import { database } from "@repo/database";

export const GET = async () => {
  // Read-only ping: menjaga koneksi tetap hangat tanpa menulis ke data produksi.
  await database.categories.count();

  return new Response("OK", { status: 200 });
};
