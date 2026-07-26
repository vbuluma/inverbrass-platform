/**
 * Purpose:
 * READ-ONLY smoke validation for platform reference data and security hashing.
 *
 * Principles (BP-001 Foundation Stabilization):
 * - Smoke tests NEVER create, insert, update, delete, or repair data.
 * - Smoke tests NEVER seed reference catalogues.
 * - Missing required data causes FAIL with a clear message.
 * - Seeding remains the responsibility of `npm run db:seed` only.
 *
 * Usage:
 *   npx tsx scripts/ip006a-smoke-validation.ts
 */

import { existsSync } from "node:fs";
import path from "node:path";

import "@/lib/env/load-env";

import { CATALOG_EMPTY_MESSAGES } from "@/core/auth/catalog-messages";
import { createReferenceDataService } from "@/core/auth/services/reference-data-service";
import { createSecurityQuestionService } from "@/core/auth/services/security-question-service";
import { validatePlatformReferenceData } from "@/core/platform/platform-startup-validation-service";
import { closeDb } from "@/db/client";
import { SETUP_WELCOME_MESSAGE } from "@/modules/business/onboarding/constants";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/seeds/countries.ts",
  "src/db/seeds/countries-seed.ts",
  "src/db/seeds/industries-seed.ts",
  "src/db/seeds/business-types-seed.ts",
  "src/db/seeds/business-membership-statuses-seed.ts",
  "src/core/platform/platform-startup-validation-service.ts",
  "src/instrumentation.ts",
  "src/core/auth/catalog-messages.ts",
  "src/components/auth/catalog-empty-notice.tsx",
  "src/core/auth/services/credential-service.ts",
  "src/core/auth/session/auth-session-cookie.ts",
  "drizzle/0005_ip006a_platform_foundation.sql",
  "drizzle/0006_bp001_platform_registration.sql",
  "drizzle/0007_bp001_platform_auth.sql",
  "drizzle/0008_bp001_restore_business_foundation.sql",
] as const;

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function checkRequiredFiles(): CheckResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolutePath = path.join(ROOT, relativePath);
    const ok = existsSync(absolutePath);

    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "missing",
    };
  });
}

function checkWelcomeAndMessages(): CheckResult[] {
  return [
    {
      name: "welcome:messageTemplatePresent",
      ok:
        SETUP_WELCOME_MESSAGE.includes("{businessName}") &&
        SETUP_WELCOME_MESSAGE.trim().length > 0,
    },
    {
      name: "ui:emptyCatalogMessagesDefined",
      ok:
        CATALOG_EMPTY_MESSAGES.countries.length > 0 &&
        CATALOG_EMPTY_MESSAGES.industries.length > 0 &&
        CATALOG_EMPTY_MESSAGES.businessTypes.length > 0 &&
        CATALOG_EMPTY_MESSAGES.businessTemplatesForIndustry.length > 0 &&
        CATALOG_EMPTY_MESSAGES.currencies.length > 0 &&
        CATALOG_EMPTY_MESSAGES.securityQuestions.length > 0,
    },
  ];
}

/**
 * WHAT: Read-only catalogue existence checks.
 * WHY: Missing seed data must FAIL clearly — smoke must not repair it.
 */
async function checkLookupsAndData(): Promise<CheckResult[]> {
  if (!process.env.DATABASE_URL) {
    return [
      {
        name: "data:databaseConfigured",
        ok: false,
        detail: "DATABASE_URL missing — cannot verify reference data",
      },
    ];
  }

  const results: CheckResult[] = [];
  const referenceDataService = createReferenceDataService();
  const securityQuestionService = createSecurityQuestionService();

  // Sequential reads — session pooler max:1 must not fan out concurrent queries.
  const countries = await referenceDataService.getActiveCountries();
  const industries = await referenceDataService.getActiveIndustries();
  const businessTypes = await referenceDataService.getActiveBusinessTypes();
  const currencies = await referenceDataService.getActiveCurrencies();
  const securityQuestions = await securityQuestionService.getActiveCatalog();

  results.push({
    name: "data:countriesExist",
    ok: countries.length > 0,
    detail:
      countries.length > 0
        ? `count=${countries.length}`
        : "FAIL — no active countries. Run npm run db:seed",
  });
  results.push({
    name: "data:industriesExist",
    ok: industries.length > 0,
    detail:
      industries.length > 0
        ? `count=${industries.length}`
        : "FAIL — no active industries. Run npm run db:seed",
  });
  results.push({
    name: "data:businessTemplatesExist",
    ok: businessTypes.length > 0,
    detail:
      businessTypes.length > 0
        ? `count=${businessTypes.length}`
        : "FAIL — no active business templates. Run npm run db:seed",
  });
  results.push({
    name: "data:currenciesExist",
    ok: currencies.length > 0,
    detail:
      currencies.length > 0
        ? `count=${currencies.length}`
        : "FAIL — no active currencies. Run npm run db:seed",
  });
  results.push({
    name: "data:securityQuestionsExist",
    ok: securityQuestions.length > 0,
    detail:
      securityQuestions.length > 0
        ? `count=${securityQuestions.length}`
        : "FAIL — no active security questions. Run npm run db:seed",
  });

  results.push({
    name: "lookup:platformRegistrationCatalogsPopulated",
    ok: countries.length > 0 && securityQuestions.length > 0,
    detail:
      countries.length > 0 && securityQuestions.length > 0
        ? undefined
        : "FAIL — countries and security questions required for registration",
  });
  results.push({
    name: "lookup:businessRegistrationCatalogsPopulated",
    ok:
      industries.length > 0 &&
      businessTypes.length > 0 &&
      countries.length > 0,
    detail:
      industries.length > 0 && businessTypes.length > 0 && countries.length > 0
        ? undefined
        : "FAIL — industries, templates, and countries required for business creation",
  });

  let templateFilterOk = false;
  if (industries.length > 0) {
    const filtered = await referenceDataService.getActiveBusinessTypes(
      industries[0].id
    );
    templateFilterOk =
      filtered.length >= 0 &&
      filtered.every((template) => template.industryId === industries[0].id);
  }

  results.push({
    name: "lookup:businessTemplatesFilterByIndustry",
    ok: industries.length > 0 && templateFilterOk,
    detail:
      industries.length === 0
        ? "FAIL — no industries to filter templates"
        : undefined,
  });

  // In-memory hashing proof only — does not write to the database.
  const sampleAnswer = "MyChildhoodStreet";
  const hash = await securityQuestionService.hashAnswer(sampleAnswer);
  const verified = await securityQuestionService.verifyAnswer(
    sampleAnswer,
    hash
  );
  const looksHashed = /^\$2[aby]?\$\d{2}\$/.test(hash);

  results.push({
    name: "security:answersAreHashedInMemory",
    ok: looksHashed && verified && hash !== sampleAnswer,
    detail: looksHashed ? "bcrypt" : "unexpected-hash-format",
  });

  const startupChecks = await validatePlatformReferenceData();
  results.push({
    name: "startup:validationRunnable",
    ok: startupChecks.length >= 5,
    detail: `checks=${startupChecks.length}`,
  });
  results.push({
    name: "startup:requiredCatalogsHealthy",
    ok: startupChecks.every((check) => check.ok),
    detail:
      startupChecks
        .filter((check) => !check.ok)
        .map((check) => check.name)
        .join(",") || "all-ok",
  });

  return results;
}

function printResults(results: CheckResult[]): boolean {
  let passed = 0;

  for (const result of results) {
    if (result.ok) {
      passed += 1;
      console.log(
        `PASS  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
      );
    } else {
      console.log(
        `FAIL  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
      );
    }
  }

  console.log("");
  console.log(
    `IP-006A smoke validation (READ-ONLY): ${passed}/${results.length} checks passed.`
  );

  return passed === results.length;
}

async function main() {
  console.log(
    "Running IP-006A READ-ONLY platform reference & security smoke validation..."
  );
  console.log("");

  try {
    const results = [
      ...checkRequiredFiles(),
      ...checkWelcomeAndMessages(),
      ...(await checkLookupsAndData()),
    ];

    const ok = printResults(results);
    process.exitCode = ok ? 0 : 1;
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("IP-006A smoke validation crashed:");
  console.error(error);
  process.exitCode = 1;
});
