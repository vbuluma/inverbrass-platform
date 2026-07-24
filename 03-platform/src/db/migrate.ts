/**
 * Purpose:
 * Apply Drizzle SQL migrations against the configured PostgreSQL database.
 *
 * Why the shared env loader is imported first:
 * Local secrets live in `.env.local`. Loading them through `load-env` lets
 * `npm run db:migrate` resolve `DATABASE_URL` without `--env-file=.env.local`.
 *
 * Non-responsibilities:
 * - Schema design
 * - Seed data
 * - Business logic
 */

import "@/lib/env/load-env";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigration() {
  // ----------------------------------------------------
  // Read DATABASE_URL after shared env load.
  // Why: migrate must fail fast with a clear message if secrets are absent.
  // ----------------------------------------------------
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("🔄 Connecting to Supabase...");

  const sql = postgres(connectionString, {
    max: 1,
  });

  const db = drizzle(sql);

  console.log("🚀 Applying migrations...");

  try {
    await migrate(db, {
      migrationsFolder: "./drizzle",
    });

    console.log("✅ Migrations applied successfully.");
  } catch (error) {
    console.error("❌ Migration failed:");
    console.error(error);
  } finally {
    await sql.end();
  }
}

runMigration();
