/**
 * Purpose:
 * Provide a process-wide reusable Drizzle PostgreSQL client.
 *
 * Design rationale:
 * Supabase session-mode poolers enforce a low concurrent client limit
 * (EMAXCONNSESSION). This module keeps a single shared connection (max: 1),
 * releases idle sockets, and exposes closeDb() so scripts always free the slot.
 *
 * Why this exists:
 * BP-001 final stabilization — prevent connection exhaustion across migrate,
 * seed, smoke, and Next.js workers.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

let client: ReturnType<typeof postgres> | undefined;
let database: PostgresJsDatabase<typeof schema> | undefined;

/**
 * WHAT: Build postgres.js options tuned for Supabase session poolers.
 * WHY: One connection per process + idle release avoids EMAXCONNSESSION.
 */
export function createPostgresOptions(): Parameters<typeof postgres>[1] {
  return {
    // Session poolers (port 5432) allow few concurrent clients per role.
    max: 1,
    // Return sockets to the pooler when idle.
    idle_timeout: 20,
    // Recycle long-lived sockets to avoid stale session handles.
    max_lifetime: 60 * 30,
    connect_timeout: 30,
    // Prepared statements are incompatible with some pooler modes.
    prepare: false,
  };
}

/**
 * WHAT: Return the shared Drizzle database handle for this process.
 * WHY: Reuse one connection instead of opening a new client per call.
 */
export function getDb(): PostgresJsDatabase<typeof schema> {
  if (database) {
    return database;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  client = postgres(connectionString, createPostgresOptions());
  database = drizzle(client, { schema });

  return database;
}

/**
 * WHAT: Close the shared postgres client and clear the singleton.
 * WHY: Scripts (migrate/seed/smoke) must release the session-pooler slot.
 */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = undefined;
    database = undefined;
  }
}

export type DbClient = PostgresJsDatabase<typeof schema>;
