import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside a React Server Component; stub it so the
      // pure helpers in this package can be unit tested.
      "server-only": path.resolve(import.meta.dirname, "./__tests__/stubs/server-only.ts"),
    },
  },
});
