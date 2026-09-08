import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env itself, and `prisma studio` runs from
// apps/studio, so resolve the file relative to this config rather than cwd.
config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
