/**
 * Purpose:
 * One-shot schema verification for migration 0007 (BP-001 platform auth).
 * Always closes the DB client.
 */

import "@/lib/env/load-env";

import postgres from "postgres";

import { createPostgresOptions } from "@/db/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("Connecting (max:1)...");
  const started = Date.now();
  const sql = postgres(connectionString, {
    ...createPostgresOptions(),
    connect_timeout: 20,
  });

  try {
    const ping = await sql`select 1 as ok`;
    console.log(`Connected in ${Date.now() - started}ms`, ping);

    const cols = await sql`
      SELECT table_name, column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'user_security_profile' AND column_name = 'password_hash')
          OR (table_name = 'platform_user' AND column_name IN ('email', 'auth_user_id'))
        )
      ORDER BY table_name, column_name
    `;
    console.log(JSON.stringify(cols, null, 2));

    const migrations = await sql`
      SELECT id, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at
    `;
    console.log(`migrations=${migrations.length}`);
  } finally {
    await sql.end({ timeout: 5 });
    console.log("Closed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
