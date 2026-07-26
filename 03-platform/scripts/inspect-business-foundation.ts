/**
 * Purpose:
 * Inspect whether business / business_type exist and what migrations are recorded.
 */

import "@/lib/env/load-env";

import postgres from "postgres";

import { createPostgresOptions } from "@/db/client";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, createPostgresOptions());

  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log(
      "TABLES:",
      tables.map((t) => t.table_name).join(", ")
    );

    const required = [
      "business",
      "business_type",
      "business_membership",
      "business_profile",
      "business_configuration",
      "business_setup_progress",
      "business_operating_currency",
      "country",
      "role",
      "user_role",
      "platform_user",
      "industry",
    ];
    for (const name of required) {
      const present = tables.some((t) => t.table_name === name);
      console.log(`${present ? "PRESENT" : "MISSING"}  ${name}`);
    }

    const cols = await sql`
      SELECT table_name, column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('business', 'business_type')
      ORDER BY table_name, ordinal_position
    `;
    console.log("COLUMNS:", JSON.stringify(cols, null, 2));

    const fks = await sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        ccu.table_name AS references_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (
          tc.table_name IN ('business', 'business_type')
          OR ccu.table_name IN ('business', 'business_type')
        )
      ORDER BY tc.table_name, tc.constraint_name
    `;
    console.log("FK_RELATED:", JSON.stringify(fks, null, 2));

    const mig = await sql`
      SELECT id, hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at
    `;
    console.log("MIGRATION_ROWS:", mig.length);
    for (const row of mig) {
      console.log(JSON.stringify(row));
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
