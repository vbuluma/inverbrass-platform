import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/db/schema";

let client: ReturnType<typeof postgres> | undefined;
let database: PostgresJsDatabase<typeof schema> | undefined;

export function getDb(): PostgresJsDatabase<typeof schema> {
  if (database) {
    return database;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  client = postgres(connectionString, { max: 10 });
  database = drizzle(client, { schema });

  return database;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = undefined;
    database = undefined;
  }
}

export type DbClient = PostgresJsDatabase<typeof schema>;
