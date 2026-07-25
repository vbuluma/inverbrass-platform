/**
 * Purpose:
 * Apply Drizzle SQL migrations against the configured PostgreSQL database.
 *
 * Why connection handling matters:
 * Supabase session poolers reject new clients when prior migrate/seed/Next
 * processes leave sockets open. This runner uses max: 1 and always ends the
 * client in finally.
 */

import "@/lib/env/load-env";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { createPostgresOptions } from "@/db/client";

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("🔄 Connecting to Supabase (single session client)...");

  const sql = postgres(connectionString, createPostgresOptions());
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
    process.exitCode = 1;
  } finally {
    // Always release the session-pooler slot.
    await sql.end({ timeout: 5 });
  }
}

runMigration();
