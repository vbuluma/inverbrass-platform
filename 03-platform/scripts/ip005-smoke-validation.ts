/**
 * Purpose:
 * Smoke-validate IP-005 Authentication UI deliverables without mutating data.
 *
 * Business Context:
 * Confirms that BP-001 Phase 1 auth routes, services, actions, validators, and
 * UI entry points remain present and structurally sound after implementation.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Verify required IP-005 production files exist on disk
 * - Exercise recovery and registration UI validators with known payloads
 * - Confirm service factories and admin client helpers are importable
 *
 * Non-Responsibilities:
 * - End-to-end browser testing
 * - Database or Supabase live credential checks
 *
 * Usage:
 *   npx tsx scripts/ip005-smoke-validation.ts
 */

import { existsSync } from "node:fs";
import path from "node:path";

import {
  recoveryCompletionSchema,
  recoveryInitiationSchema,
} from "@/core/auth/validators/recovery-validators";
import { ownerRegistrationUiSchema } from "@/core/auth/validators/registration-ui-validators";
import { createPasswordRecoveryService } from "@/core/auth/services/password-recovery-service";
import { createReferenceDataService } from "@/core/auth/services/reference-data-service";
import { createAdminClient } from "@/lib/supabase/admin";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/app/(public)/login/page.tsx",
  "src/app/(public)/login/login-form.tsx",
  "src/app/(public)/login/login-recovery-alert.tsx",
  "src/app/(public)/register/page.tsx",
  "src/app/(public)/register/register-form.tsx",
  "src/app/(public)/forgot-password/page.tsx",
  "src/app/(public)/forgot-password/forgot-password-form.tsx",
  "src/app/(authenticated)/select-business/page.tsx",
  "src/app/(authenticated)/select-business/select-business-list.tsx",
  "src/core/auth/services/password-recovery-service.ts",
  "src/core/auth/services/reference-data-service.ts",
  "src/core/auth/actions/recovery-actions.ts",
  "src/core/auth/actions/select-business-actions.ts",
  "src/core/auth/actions/catalog-actions.ts",
  "src/core/auth/validators/recovery-validators.ts",
  "src/core/auth/validators/registration-ui-validators.ts",
  "src/core/auth/utils/registration-ui-mapper.ts",
  "src/lib/supabase/admin.ts",
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

function checkValidators(): CheckResult[] {
  const initiation = recoveryInitiationSchema.safeParse({
    mobileNumber: "712345678",
    countryCode: "KE",
  });

  const completion = recoveryCompletionSchema.safeParse({
    mobileNumber: "712345678",
    countryCode: "KE",
    securityAnswer: "Nairobi",
    newPassword: "Secure1!",
    confirmPassword: "Secure1!",
  });

  const registration = ownerRegistrationUiSchema.safeParse({
    businessName: "InverBrass Demo",
    businessTypeId: "00000000-0000-4000-8000-000000000001",
    countryCode: "KE",
    mobileNumber: "712345678",
    password: "Secure1!",
    confirmPassword: "Secure1!",
    securityQuestionId: "00000000-0000-4000-8000-000000000002",
    securityAnswer: "Nairobi",
  });

  return [
    {
      name: "validator:recoveryInitiationSchema",
      ok: initiation.success,
      detail: initiation.success
        ? undefined
        : initiation.error.issues[0]?.message,
    },
    {
      name: "validator:recoveryCompletionSchema",
      ok: completion.success,
      detail: completion.success
        ? undefined
        : completion.error.issues[0]?.message,
    },
    {
      name: "validator:ownerRegistrationUiSchema",
      ok: registration.success,
      detail: registration.success
        ? undefined
        : registration.error.issues[0]?.message,
    },
  ];
}

function checkServiceFactories(): CheckResult[] {
  const results: CheckResult[] = [];

  try {
    const recoveryService = createPasswordRecoveryService();
    results.push({
      name: "factory:createPasswordRecoveryService",
      ok: typeof recoveryService.initiateRecovery === "function",
    });
  } catch (error) {
    results.push({
      name: "factory:createPasswordRecoveryService",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const referenceDataService = createReferenceDataService();
    results.push({
      name: "factory:createReferenceDataService",
      ok: typeof referenceDataService.getActiveCountries === "function",
    });
  } catch (error) {
    results.push({
      name: "factory:createReferenceDataService",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    // Importability check only — credentials may be absent in local smoke runs.
    const hasFactory = typeof createAdminClient === "function";
    results.push({
      name: "factory:createAdminClient",
      ok: hasFactory,
    });
  } catch (error) {
    results.push({
      name: "factory:createAdminClient",
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

function printResults(results: CheckResult[]): boolean {
  let passed = 0;

  for (const result of results) {
    if (result.ok) {
      passed += 1;
      console.log(`PASS  ${result.name}`);
    } else {
      console.log(
        `FAIL  ${result.name}${result.detail ? ` — ${result.detail}` : ""}`
      );
    }
  }

  console.log("");
  console.log(`IP-005 smoke validation: ${passed}/${results.length} checks passed.`);

  return passed === results.length;
}

async function main() {
  console.log("Running IP-005 Authentication UI smoke validation...");
  console.log("");

  const results = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkServiceFactories(),
  ];

  const ok = printResults(results);

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IP-005 smoke validation crashed:");
  console.error(error);
  process.exitCode = 1;
});
