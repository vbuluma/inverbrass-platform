import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigration() {
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