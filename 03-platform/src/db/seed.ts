/**
 * Purpose:
 * Seed all platform reference catalogues required for BP-001 onboarding.
 *
 * Connection policy:
 * Uses a single postgres client and always closes it so seed does not
 * contribute to EMAXCONNSESSION on Supabase session poolers.
 */

import "@/lib/env/load-env";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { createPostgresOptions } from "@/db/client";
import {
  formatSeedSummary,
  seedIamReferenceData,
} from "@/db/seeds/iam-seed";
import { seedBusinessMembershipStatuses } from "@/db/seeds/business-membership-statuses-seed";
import { seedBusinessTypes } from "@/db/seeds/business-types-seed";
import { seedCountries } from "@/db/seeds/countries-seed";
import { seedCurrencies } from "@/db/seeds/currencies-seed";
import { seedIndustries } from "@/db/seeds/industries-seed";
import { seedLanguages } from "@/db/seeds/languages-seed";
import { seedOrganizationTypes } from "@/db/seeds/organization-types-seed";
import { seedPartyStatuses } from "@/db/seeds/party-statuses-seed";
import { seedPartyTypes } from "@/db/seeds/party-types-seed";
import { seedRoleTypes } from "@/db/seeds/role-types-seed";
import { seedContactTypes } from "@/db/seeds/contact-types-seed";
import { seedAddressTypes } from "@/db/seeds/address-types-seed";
import { seedOrganizationalUnitTypes } from "@/db/seeds/organizational-unit-types-seed";
import { seedRelationshipTypes } from "@/db/seeds/relationship-types-seed";
import { seedSecurityQuestions } from "@/db/seeds/security-questions-seed";

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("Connecting to database (single session client)...");

  const sql = postgres(connectionString, createPostgresOptions());
  const db = drizzle(sql);

  try {
    console.log("Seeding IAM reference data...");
    const iamResults = await seedIamReferenceData(db);
    console.log("IAM seed complete.");
    console.log(formatSeedSummary(iamResults));

    console.log("Seeding business membership statuses...");
    const membershipStatusResults = await seedBusinessMembershipStatuses(db);
    console.log(
      `membershipStatuses: inserted=${membershipStatusResults.inserted}, updated=${membershipStatusResults.updated}, skipped=${membershipStatusResults.skipped}`
    );

    console.log("Seeding industries...");
    const industryResults = await seedIndustries(db);
    console.log(
      `industries: inserted=${industryResults.inserted}, updated=${industryResults.updated}, skipped=${industryResults.skipped}`
    );

    console.log("Seeding business types...");
    const businessTypeResults = await seedBusinessTypes(db);
    console.log(
      `businessTypes: inserted=${businessTypeResults.inserted}, updated=${businessTypeResults.updated}, skipped=${businessTypeResults.skipped}`
    );

    console.log("Seeding countries...");
    const countryResults = await seedCountries(db);
    console.log(
      `countries: inserted=${countryResults.inserted}, updated=${countryResults.updated}, skipped=${countryResults.skipped}`
    );

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

    console.log("Seeding party types...");
    const partyTypeResults = await seedPartyTypes(db);
    console.log(
      `partyTypes: inserted=${partyTypeResults.inserted}, updated=${partyTypeResults.updated}, skipped=${partyTypeResults.skipped}`
    );

    console.log("Seeding party statuses...");
    const partyStatusResults = await seedPartyStatuses(db);
    console.log(
      `partyStatuses: inserted=${partyStatusResults.inserted}, updated=${partyStatusResults.updated}, skipped=${partyStatusResults.skipped}`
    );

    console.log("Seeding organization types...");
    const organizationTypeResults = await seedOrganizationTypes(db);
    console.log(
      `organizationTypes: inserted=${organizationTypeResults.inserted}, updated=${organizationTypeResults.updated}, skipped=${organizationTypeResults.skipped}`
    );

    console.log("Seeding languages...");
    const languageResults = await seedLanguages(db);
    console.log(
      `languages: inserted=${languageResults.inserted}, updated=${languageResults.updated}, skipped=${languageResults.skipped}`
    );

    console.log("Seeding party role types...");
    const roleTypeResults = await seedRoleTypes(db);
    console.log(
      `roleTypes: inserted=${roleTypeResults.inserted}, updated=${roleTypeResults.updated}, skipped=${roleTypeResults.skipped}`
    );

    console.log("Seeding contact types...");
    const contactTypeResults = await seedContactTypes(db);
    console.log(
      `contactTypes: inserted=${contactTypeResults.inserted}, updated=${contactTypeResults.updated}, skipped=${contactTypeResults.skipped}`
    );

    console.log("Seeding address types...");
    const addressTypeResults = await seedAddressTypes(db);
    console.log(
      `addressTypes: inserted=${addressTypeResults.inserted}, updated=${addressTypeResults.updated}, skipped=${addressTypeResults.skipped}`
    );

    console.log("Seeding relationship types...");
    const relationshipTypeResults = await seedRelationshipTypes(db);
    console.log(
      `relationshipTypes: inserted=${relationshipTypeResults.inserted}, updated=${relationshipTypeResults.updated}, skipped=${relationshipTypeResults.skipped}`
    );

    console.log("Seeding organizational unit types...");
    const organizationalUnitTypeResults = await seedOrganizationalUnitTypes(db);
    console.log(
      `organizationalUnitTypes: inserted=${organizationalUnitTypeResults.inserted}, updated=${organizationalUnitTypeResults.updated}, skipped=${organizationalUnitTypeResults.skipped}`
    );

    console.log("✅ Seed completed.");
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

runSeed();
