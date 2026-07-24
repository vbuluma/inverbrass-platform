/**
 * Purpose:
 * Seed IAM, security-question, and currency reference data.
 *
 * Why the shared env loader is imported first:
 * Ensures `DATABASE_URL` is read from `.env.local` (then `.env`) consistently
 * with migrate and other Node utility scripts.
 *
 * Non-responsibilities:
 * - Schema migrations
 * - Business transaction seeding
 */

import "@/lib/env/load-env";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  formatSeedSummary,
  seedIamReferenceData,
} from "@/db/seeds/iam-seed";
import { seedCurrencies } from "@/db/seeds/currencies-seed";
import { seedSecurityQuestions } from "@/db/seeds/security-questions-seed";

async function runSeed() {
  // ----------------------------------------------------
  // DATABASE_URL must already be available via load-env.
  // ----------------------------------------------------
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

    console.log("Seeding security question catalog...");

    const securityQuestionResults = await seedSecurityQuestions(db);

    console.log(
      `securityQuestions: inserted=${securityQuestionResults.inserted}, updated=${securityQuestionResults.updated}, skipped=${securityQuestionResults.skipped}`
    );

    console.log("Seeding currency catalog...");

    const currencyResults = await seedCurrencies(db);

    console.log(
      `currencies: inserted=${currencyResults.inserted}, updated=${currencyResults.updated}, skipped=${currencyResults.skipped}`
    );
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

runSeed();
