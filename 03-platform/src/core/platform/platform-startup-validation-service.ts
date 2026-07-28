/**
 * Purpose:
 * Validate required platform reference data during application startup.
 *
 * Design rationale:
 * Centralises readiness checks so Next.js instrumentation can warn/error
 * without crashing the process. Services own the queries; this module owns
 * the startup policy (dev warn vs production error log).
 *
 * Business rationale:
 * Smoke test 1 failed when catalogues were empty. Early validation surfaces
 * missing seed data before users hit blank selectors.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import { count, eq } from "drizzle-orm";

import { SETUP_WELCOME_MESSAGE } from "@/modules/business/onboarding/constants";
import { getDb } from "@/db/client";
import { businessType } from "@/db/schema/business-type";
import { country } from "@/db/schema/country";
import { currency } from "@/db/schema/currency";
import { securityQuestion } from "@/db/schema/security-question";

export type PlatformReferenceCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

async function countActive(
  table:
    | typeof country
    | typeof businessType
    | typeof currency
    | typeof securityQuestion,
  isActiveColumn:
    | typeof country.isActive
    | typeof businessType.isActive
    | typeof currency.isActive
    | typeof securityQuestion.isActive
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ value: count() })
    .from(table)
    .where(eq(isActiveColumn, true));

  return Number(row?.value ?? 0);
}

/**
 * WHAT: Inspect welcome copy and active reference catalogue counts.
 * WHY: Startup must detect missing seed data without throwing to callers.
 */
export async function validatePlatformReferenceData(): Promise<
  PlatformReferenceCheck[]
> {
  const checks: PlatformReferenceCheck[] = [];

  // ----------------------------------------------------
  // Welcome message is configuration text used by setup.
  // ----------------------------------------------------
  const welcomeOk = SETUP_WELCOME_MESSAGE.trim().length > 0;
  checks.push({
    name: "welcomeMessage",
    ok: welcomeOk,
    detail: welcomeOk
      ? "present"
      : "SETUP_WELCOME_MESSAGE is empty",
  });

  try {
    const countries = await countActive(country, country.isActive);
    const businessTypes = await countActive(businessType, businessType.isActive);
    const currencies = await countActive(currency, currency.isActive);
    const securityQuestions = await countActive(
      securityQuestion,
      securityQuestion.isActive
    );

    checks.push({
      name: "countries",
      ok: countries > 0,
      detail: `active=${countries}`,
    });
    checks.push({
      name: "businessTypes",
      ok: businessTypes > 0,
      detail: `active=${businessTypes}`,
    });
    checks.push({
      name: "currencies",
      ok: currencies > 0,
      detail: `active=${currencies}`,
    });
    checks.push({
      name: "securityQuestions",
      ok: securityQuestions > 0,
      detail: `active=${securityQuestions}`,
    });
  } catch (error) {
    // ----------------------------------------------------
    // Database may be unavailable at build time — report, do not throw.
    // ----------------------------------------------------
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    checks.push({
      name: "referenceDataQuery",
      ok: false,
      detail: message,
    });
  }

  return checks;
}

/**
 * WHAT: Log startup validation results by environment policy.
 * WHY: Development warns; production errors; neither crashes the app.
 */
export async function runPlatformStartupValidation(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const checks = await validatePlatformReferenceData();
  const failures = checks.filter((check) => !check.ok);

  for (const check of checks) {
    const line = `[platform-startup] ${check.name}: ${check.ok ? "ok" : "missing"} (${check.detail})`;

    if (check.ok) {
      console.info(line);
      continue;
    }

    if (isProduction) {
      console.error(line);
    } else {
      console.warn(line);
    }
  }

  if (failures.length === 0) {
    console.info("[platform-startup] Required reference data validation passed.");
    return;
  }

  const summary = `[platform-startup] ${failures.length} required reference check(s) failed. Seed the database before onboarding.`;

  if (isProduction) {
    console.error(summary);
  } else {
    console.warn(summary);
  }
}
