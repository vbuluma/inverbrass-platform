/**
 * Purpose:
 * Smoke-validate IP-006 / BP-001 Business Activation & Configuration Wizard.
 *
 * WHY:
 * Confirms structural completeness and deterministic business-rule behaviour for
 * happy, optional-skip, negative, and resume paths without live DB mutations.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * BP-001 / IP-006 – Business Activation & Configuration Wizard
 *
 * Usage:
 *   npx tsx scripts/ip006-smoke-validation.ts
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { BUSINESS_STATUS } from "@/core/auth/constants";
import {
  MANDATORY_SETUP_STEPS,
  OPTIONAL_SETUP_STEPS,
  SETUP_STEPS,
  SETUP_WIZARD_VERSION,
} from "@/modules/business/onboarding/constants";
import { createBusinessSetupService } from "@/modules/business/onboarding/services/business-setup-service";
import {
  applyCompletedStep,
  areMandatoryStepsComplete,
  buildBranchCodeCandidate,
  createDefaultConfigurationSettings,
  hasCompletedBaseCurrencyStep,
  hasDuplicateOperatingCurrency,
  isOperationalAccessAllowed,
  mergeConfigurationSettings,
  normalizeSetupStep,
  resolveResumeStep,
  simulateHappyPathCompletedSteps,
  simulateOptionalSkipCompletedSteps,
  toConfigurationView,
} from "@/modules/business/onboarding/services/setup-rules";
import {
  additionalCurrenciesSchema,
  baseCurrencySchema,
  branchSetupSchema,
  businessClassificationSchema,
  businessDetailsSchema,
  businessOperationsSchema,
  countryStepSchema,
  employeeSetupSchema,
  paymentMethodsSchema,
  receiptConfigurationSchema,
} from "@/modules/business/onboarding/validators/setup-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/modules/business/onboarding/services/business-setup-service.ts",
  "src/modules/business/onboarding/services/setup-rules.ts",
  "src/modules/business/onboarding/actions/setup-actions.ts",
  "src/modules/business/onboarding/validators/setup-validators.ts",
  "src/modules/business/onboarding/constants.ts",
  "src/modules/business/onboarding/constants/branch-types.ts",
  "src/modules/business/onboarding/utils/setup-step-timing.ts",
  "src/modules/business/onboarding/components/setup-wizard.tsx",
  "src/modules/business/onboarding/components/setup-progress-indicator.tsx",
  "src/modules/business/onboarding/repositories/business-configuration-repository.ts",
  "src/modules/business/onboarding/repositories/business-setup-progress-repository.ts",
  "src/modules/business/onboarding/repositories/branch-repository.ts",
  "src/modules/business/onboarding/repositories/business-employee-repository.ts",
  "src/app/(authenticated)/setup/page.tsx",
  "src/app/(authenticated)/setup/layout.tsx",
  "src/app/(authenticated)/setup/[step]/page.tsx",
  "src/app/(authenticated)/setup/activated/page.tsx",
  "src/db/schema/business-profile.ts",
  "src/db/schema/business-operating-currency.ts",
  "src/db/schema/business-configuration.ts",
  "src/db/schema/business-setup-progress.ts",
  "src/db/schema/branch.ts",
  "src/db/schema/business-employee.ts",
  "src/db/schema/currency.ts",
  "src/db/seeds/currencies.ts",
  "src/db/seeds/currencies-seed.ts",
  "src/core/auth/utils/temporary-password.ts",
  "drizzle/0002_ip006_business_setup.sql",
  "drizzle/0003_ip006_configuration_metadata.sql",
  "drizzle/0004_currency_reference.sql",
  "drizzle/0005_ip006a_platform_foundation.sql",
  "drizzle/0009_bp001_branch_employee_setup.sql",
  "src/core/auth/services/business-registration-service.ts",
  "src/app/(authenticated)/businesses/create/page.tsx",
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
  const details = businessDetailsSchema.safeParse({
    businessName: "Acme Traders",
    tradingName: "",
    logoUrl: "https://example.com/logo.png",
    email: "owner@example.com",
    physicalAddress: "1 Market Street",
    county: "Nairobi",
    city: "Nairobi",
  });

  const classification = businessClassificationSchema.safeParse({
    industryId: "550e8400-e29b-41d4-a716-446655440000",
    businessTypeId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  });

  const country = countryStepSchema.safeParse({ countryCode: "KE" });
  const base = baseCurrencySchema.safeParse({ currencyCode: "KES" });
  const additional = additionalCurrenciesSchema.safeParse({
    currencyCodes: ["USD"],
  });
  const payments = paymentMethodsSchema.safeParse({
    cashEnabled: true,
    mobileMoneyEnabled: true,
    bankTransferEnabled: false,
    cardEnabled: false,
    creditSalesEnabled: false,
  });
  const receipt = receiptConfigurationSchema.safeParse({
    receiptPrefix: "RCPT",
    receiptFooter: "Thank you",
    showLogoOnReceipt: true,
    taxEnabled: true,
    defaultTaxRate: "16",
  });
  const operations = businessOperationsSchema.safeParse({
    paymentMethods: {
      cashEnabled: true,
      mobileMoneyEnabled: true,
      bankTransferEnabled: false,
      cardEnabled: false,
      creditSalesEnabled: false,
    },
    receipt: {
      receiptPrefix: "RCPT",
      receiptFooter: "Thank you",
      showLogoOnReceipt: true,
      taxEnabled: false,
      defaultTaxRate: "0",
    },
    aiAssistantEnabled: false,
    loyaltyProgrammeEnabled: false,
  });
  const branches = branchSetupSchema.safeParse({
    hasMultipleBranches: false,
    branches: [],
  });
  const employeesSkip = employeeSetupSchema.safeParse({
    skip: true,
    employees: [],
  });

  return [
    {
      name: "validator:businessDetailsSchema",
      ok: details.success,
      detail: details.success ? undefined : details.error.issues[0]?.message,
    },
    {
      name: "validator:businessClassificationSchema",
      ok: classification.success,
      detail: classification.success
        ? undefined
        : classification.error.issues[0]?.message,
    },
    {
      name: "validator:countryStepSchema",
      ok: country.success,
      detail: country.success ? undefined : country.error.issues[0]?.message,
    },
    {
      name: "validator:baseCurrencySchema",
      ok: base.success,
      detail: base.success ? undefined : base.error.issues[0]?.message,
    },
    {
      name: "validator:additionalCurrenciesSchema",
      ok: additional.success,
      detail: additional.success
        ? undefined
        : additional.error.issues[0]?.message,
    },
    {
      name: "validator:paymentMethodsSchema",
      ok: payments.success,
      detail: payments.success ? undefined : payments.error.issues[0]?.message,
    },
    {
      name: "validator:receiptConfigurationSchema",
      ok: receipt.success,
      detail: receipt.success ? undefined : receipt.error.issues[0]?.message,
    },
    {
      name: "validator:businessOperationsSchema",
      ok: operations.success,
      detail: operations.success
        ? undefined
        : operations.error.issues[0]?.message,
    },
    {
      name: "validator:branchSetupSchema",
      ok: branches.success,
      detail: branches.success ? undefined : branches.error.issues[0]?.message,
    },
    {
      name: "validator:employeeSetupSchemaSkip",
      ok: employeesSkip.success,
      detail: employeesSkip.success
        ? undefined
        : employeesSkip.error.issues[0]?.message,
    },
  ];
}

function checkStepCatalogue(): CheckResult[] {
  return [
    {
      name: "catalogue:mandatoryIncludesReview",
      ok: MANDATORY_SETUP_STEPS.includes(SETUP_STEPS.REVIEW),
    },
    {
      name: "catalogue:mandatoryIncludesBranchSetup",
      ok: MANDATORY_SETUP_STEPS.includes(SETUP_STEPS.BRANCH_SETUP),
    },
    {
      name: "catalogue:mandatoryIncludesClassification",
      ok: MANDATORY_SETUP_STEPS.includes(SETUP_STEPS.BUSINESS_CLASSIFICATION),
    },
    {
      name: "catalogue:additionalCurrenciesOptional",
      ok: OPTIONAL_SETUP_STEPS.includes(SETUP_STEPS.ADDITIONAL_CURRENCIES),
    },
    {
      name: "catalogue:employeeSetupOptional",
      ok: OPTIONAL_SETUP_STEPS.includes(SETUP_STEPS.EMPLOYEE_SETUP),
    },
    {
      name: "catalogue:wizardVersion",
      ok: SETUP_WIZARD_VERSION === "2.0.0",
    },
    {
      name: "catalogue:legacyBusinessDetailsMapsToProfile",
      ok:
        normalizeSetupStep(SETUP_STEPS.BUSINESS_DETAILS) ===
        SETUP_STEPS.BUSINESS_PROFILE,
    },
    {
      name: "catalogue:legacyPaymentMapsToOperations",
      ok:
        normalizeSetupStep(SETUP_STEPS.PAYMENT_METHODS) ===
        SETUP_STEPS.BUSINESS_OPERATIONS,
    },
    {
      name: "migration:currencyTableInChain",
      ok: existsSync(path.join(ROOT, "drizzle/0004_currency_reference.sql")),
      detail: "currency CREATE TABLE must be in migration chain for clean DBs",
    },
    {
      name: "migration:branchEmployeeInChain",
      ok: existsSync(
        path.join(ROOT, "drizzle/0009_bp001_branch_employee_setup.sql")
      ),
    },
  ];
}

function checkServiceFactory(): CheckResult[] {
  try {
    const service = createBusinessSetupService();
    return [
      {
        name: "factory:createBusinessSetupService",
        ok: typeof service.getSetupProgress === "function",
      },
      {
        name: "factory:activateBusiness",
        ok: typeof service.activateBusiness === "function",
      },
      {
        name: "factory:saveBranchSetup",
        ok: typeof service.saveBranchSetup === "function",
      },
      {
        name: "factory:saveEmployeeSetup",
        ok: typeof service.saveEmployeeSetup === "function",
      },
    ];
  } catch (error) {
    return [
      {
        name: "factory:createBusinessSetupService",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      },
    ];
  }
}

function checkHappyPath(): CheckResult[] {
  const completed = simulateHappyPathCompletedSteps();
  const canActivate = areMandatoryStepsComplete(completed);
  const operational = isOperationalAccessAllowed(BUSINESS_STATUS.ACTIVE);

  return [
    {
      name: "happy:registerToSetupEligible",
      ok: isOperationalAccessAllowed(BUSINESS_STATUS.DRAFT) === false,
      detail: "DRAFT must not access operational modules after registration",
    },
    {
      name: "happy:completeSetupMandatory",
      ok: canActivate,
    },
    {
      name: "happy:activateEligible",
      ok: canActivate && hasCompletedBaseCurrencyStep(completed),
    },
    {
      name: "happy:redirectDashboardEligible",
      ok: operational,
      detail: "ACTIVE status unlocks dashboard/operational access",
    },
  ];
}

function checkOptionalPath(): CheckResult[] {
  const completed = simulateOptionalSkipCompletedSteps();

  return [
    {
      name: "optional:skipAdditionalCurrenciesStillMandatoryComplete",
      ok:
        !completed.includes(SETUP_STEPS.ADDITIONAL_CURRENCIES) &&
        areMandatoryStepsComplete(completed),
    },
    {
      name: "optional:skipEmployeesStillMandatoryComplete",
      ok:
        !completed.includes(SETUP_STEPS.EMPLOYEE_SETUP) &&
        areMandatoryStepsComplete(completed),
    },
    {
      name: "optional:activateSuccessfully",
      ok:
        areMandatoryStepsComplete(completed) &&
        hasCompletedBaseCurrencyStep(completed),
    },
  ];
}

function checkNegativePath(): CheckResult[] {
  const withoutBase = MANDATORY_SETUP_STEPS.filter(
    (step) => step !== SETUP_STEPS.BASE_CURRENCY
  );
  const missingBusinessName = businessDetailsSchema.safeParse({
    businessName: "",
    logoUrl: "https://example.com/logo.png",
    email: "owner@example.com",
    physicalAddress: "1 Market Street",
    county: "Nairobi",
    city: "Nairobi",
  });

  return [
    {
      name: "negative:rejectDuplicateOperatingCurrency",
      ok: hasDuplicateOperatingCurrency("KES", ["USD", "KES"]) === true,
    },
    {
      name: "negative:rejectDuplicateWithinAdditional",
      ok: hasDuplicateOperatingCurrency("KES", ["USD", "USD"]) === true,
    },
    {
      name: "negative:rejectActivationWithoutBaseCurrency",
      ok:
        hasCompletedBaseCurrencyStep(withoutBase) === false &&
        areMandatoryStepsComplete(withoutBase) === false,
    },
    {
      name: "negative:rejectOperationalAccessWhileDraft",
      ok: isOperationalAccessAllowed(BUSINESS_STATUS.DRAFT) === false,
    },
    {
      name: "negative:rejectEmptyBusinessName",
      ok: missingBusinessName.success === false,
    },
  ];
}

function checkResumePath(): CheckResult[] {
  const afterWelcome = applyCompletedStep([], SETUP_STEPS.WELCOME);
  const afterProfile = applyCompletedStep(
    afterWelcome.completedSteps,
    SETUP_STEPS.BUSINESS_PROFILE
  );
  const resume = resolveResumeStep(afterProfile.completedSteps);
  const branchCode = buildBranchCodeCandidate("Head Office");

  return [
    {
      name: "resume:saveProgressTracksLastCompleted",
      ok: afterProfile.lastCompletedStep === SETUP_STEPS.BUSINESS_PROFILE,
    },
    {
      name: "resume:resumeFromLastCompletedStep",
      ok: resume === SETUP_STEPS.BUSINESS_CLASSIFICATION,
      detail: `expected business-classification, got ${resume}`,
    },
    {
      name: "resume:branchCodeAutoGenerated",
      ok: /^[A-Z0-9]+-\d{2}$/.test(branchCode),
      detail: branchCode,
    },
  ];
}

function checkConfigurationMetadata(): CheckResult[] {
  const defaults = createDefaultConfigurationSettings();
  const merged = mergeConfigurationSettings(defaults, {
    features: {
      aiAssistantEnabled: true,
      loyaltyProgrammeEnabled: false,
    },
  });
  const view = toConfigurationView(merged);

  return [
    {
      name: "config:metadataDefaultDocument",
      ok:
        defaults.paymentMethods.cashEnabled === true &&
        defaults.features.aiAssistantEnabled === false,
    },
    {
      name: "config:metadataMergePreservesSiblings",
      ok:
        merged.features.aiAssistantEnabled === true &&
        merged.paymentMethods.cashEnabled === true,
    },
    {
      name: "config:flattenedViewForUi",
      ok: view.aiAssistantEnabled === true && view.receiptPrefix === "RCPT",
    },
  ];
}

function checkHangFixGuards(): CheckResult[] {
  const serviceSource = existsSync(
    path.join(
      ROOT,
      "src/modules/business/onboarding/services/business-setup-service.ts"
    )
  );
  const timingSource = existsSync(
    path.join(
      ROOT,
      "src/modules/business/onboarding/utils/setup-step-timing.ts"
    )
  );

  return [
    {
      name: "hangfix:timingUtilityPresent",
      ok: timingSource,
    },
    {
      name: "hangfix:serviceSourcePresent",
      ok: serviceSource,
      detail:
        "assertActiveCurrency must run before max:1 transactions (saveCountry)",
    },
  ];
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
  console.log(
    `IP-006 smoke validation: ${passed}/${results.length} checks passed.`
  );

  return passed === results.length;
}

async function main() {
  console.log(
    "Running IP-006 / BP-001 Business Activation & Configuration smoke validation..."
  );
  console.log("");

  const results = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkStepCatalogue(),
    ...checkServiceFactory(),
    ...checkHappyPath(),
    ...checkOptionalPath(),
    ...checkNegativePath(),
    ...checkResumePath(),
    ...checkConfigurationMetadata(),
    ...checkHangFixGuards(),
  ];

  const ok = printResults(results);

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IP-006 smoke validation crashed:");
  console.error(error);
  process.exitCode = 1;
});
