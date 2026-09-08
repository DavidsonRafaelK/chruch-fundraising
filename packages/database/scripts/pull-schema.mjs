/**
 * Introspect Supabase, then keep only the `public` models.
 *
 * Prisma refuses to introspect `public` alone because `profiles.id` has a
 * foreign key into `auth.users`, so we pull both schemas and drop the ~23
 * Supabase-internal `auth` models afterwards. Leaving them in would make
 * Prisma believe it owns Supabase's auth tables.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const SCHEMA = new URL("../prisma/schema.prisma", import.meta.url).pathname;
const withAuth = 'schemas  = ["auth", "public"]';
const publicOnly = 'schemas  = ["public"]';

const original = readFileSync(SCHEMA, "utf8");
writeFileSync(SCHEMA, original.replace(publicOnly, withAuth));

try {
  execFileSync("prisma", ["db", "pull"], { stdio: "inherit" });
} catch (error) {
  writeFileSync(SCHEMA, original);
  throw error;
}

const pulled = readFileSync(SCHEMA, "utf8");
const firstModel = pulled.search(/^model /m);
const head = pulled.slice(0, firstModel).replace(withAuth, publicOnly);
const models = pulled
  .slice(firstModel)
  .match(/^model \w+ \{[\s\S]*?^\}\n/gm)
  .filter((model) => model.includes('@@schema("public")'))
  .map((model) =>
    model.replace(
      /^\s*users\s+users\s+@relation\(.*\)\n/m,
      "  /// profiles.id FK ke auth.users - dikelola Supabase, sengaja tidak dipetakan Prisma\n"
    )
  );

writeFileSync(SCHEMA, head + models.map((m) => `${m.trimEnd()}\n`).join("\n"));
console.log(`Kept ${models.length} public models.`);
