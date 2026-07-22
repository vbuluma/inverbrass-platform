import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  formatSeedSummary,
  seedIamReferenceData,
} from "@/db/seeds/iam-seed";

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("Connecting to database...");

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    console.log("Seeding IAM reference data...");

    const results = await seedIamReferenceData(db);

    console.log("IAM seed complete.");
    console.log(formatSeedSummary(results));
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

runSeed();
