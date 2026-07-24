/**
 * Purpose:
 * Drizzle Kit configuration for generate/migrate tooling.
 *
 * Why the shared env loader is used:
 * Drizzle Kit needs `DATABASE_URL` from `.env.local` the same way migrate/seed do.
 * Using the shared loader avoids divergent dotenv call sites.
 *
 * Maintenance note:
 * Relative import is used because this file sits at the package root and is
 * loaded by drizzle-kit (not always via the `@/` path alias).
 */

import { defineConfig } from "drizzle-kit";

import { loadEnv } from "./src/lib/env/load-env";

// ----------------------------------------------------
// Explicit load for drizzle-kit config evaluation.
// Why: ensures env is populated before dbCredentials.url is read.
// ----------------------------------------------------
loadEnv();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
