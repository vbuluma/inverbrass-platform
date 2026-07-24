/**
 * Purpose:
 * Smoke-validate IP-006 Business Activation & Configuration Wizard deliverables.
 *
 * WHY:
 * Confirms structural completeness and deterministic business-rule behaviour for
 * happy, optional-skip, negative, and resume paths without live DB mutations.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 *
 * Usage:
 *   npx tsx scripts/ip006-smoke-validation.ts
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
  createDefaultConfigurationSettings,
  hasCompletedBaseCurrencyStep,
  hasDuplicateOperatingCurrency,
  isOperationalAccessAllowed,
  mergeConfigurationSettings,
  resolveResumeStep,
  simulateHappyPathCompletedSteps,
  simulateOptionalSkipCompletedSteps,
  toConfigurationView,
} from "@/modules/business/onboarding/services/setup-rules";
import {
  additionalCurrenciesSchema,
  baseCurrencySchema,
  businessDetailsSchema,
  countryStepSchema,
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
  "src/modules/business/onboarding/components/setup-wizard.tsx",
  "src/modules/business/onboarding/components/setup-progress-indicator.tsx",
  "src/modules/business/onboarding/repositories/business-configuration-repository.ts",
  "src/modules/business/onboarding/repositories/business-setup-progress-repository.ts",
  "src/app/(authenticated)/setup/page.tsx",
  "src/app/(authenticated)/setup/layout.tsx",
  "src/app/(authenticated)/setup/[step]/page.tsx",
  "src/app/(authenticated)/setup/activated/page.tsx",
  "src/db/schema/business-profile.ts",
  "src/db/schema/business-operating-currency.ts",
  "src/db/schema/business-configuration.ts",
  "src/db/schema/business-setup-progress.ts",
  "src/db/schema/currency.ts",
  "src/db/seeds/currencies.ts",
  "src/db/seeds/currencies-seed.ts",
  "drizzle/0002_ip006_business_setup.sql",
  "drizzle/0003_ip006_configuration_metadata.sql",
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
    tradingName: "",
    logoUrl: "https://example.com/logo.png",
    email: "owner@example.com",
    physicalAddress: "1 Market Street",
    county: "Nairobi",
    city: "Nairobi",
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

  return [
    {
      name: "validator:businessDetailsSchema",
      ok: details.success,
      detail: details.success ? undefined : details.error.issues[0]?.message,
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
  ];
}

function checkStepCatalogue(): CheckResult[] {
  return [
    {
      name: "catalogue:mandatoryIncludesReview",
      ok: MANDATORY_SETUP_STEPS.includes(SETUP_STEPS.REVIEW),
    },
    {
      name: "catalogue:additionalCurrenciesOptional",
      ok: OPTIONAL_SETUP_STEPS.includes(SETUP_STEPS.ADDITIONAL_CURRENCIES),
    },
    {
      name: "catalogue:aiOptional",
      ok: OPTIONAL_SETUP_STEPS.includes(SETUP_STEPS.AI_TOGGLE),
    },
    {
      name: "catalogue:loyaltyOptional",
      ok: OPTIONAL_SETUP_STEPS.includes(SETUP_STEPS.LOYALTY_TOGGLE),
    },
    {
      name: "catalogue:wizardVersion",
      ok: SETUP_WIZARD_VERSION === "1.0.0",
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

/**
 * Happy path: register → complete setup → activate → dashboard eligibility.
 * Deterministic rule simulation (no live registration DB writes).
 */
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

/**
 * Optional path: skip AI and Loyalty, still activate.
 */
function checkOptionalPath(): CheckResult[] {
  const completed = simulateOptionalSkipCompletedSteps();

  return [
    {
      name: "optional:skipAiStillMandatoryComplete",
      ok:
        !completed.includes(SETUP_STEPS.AI_TOGGLE) &&
        areMandatoryStepsComplete(completed),
    },
    {
      name: "optional:skipLoyaltyStillMandatoryComplete",
      ok:
        !completed.includes(SETUP_STEPS.LOYALTY_TOGGLE) &&
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

/**
 * Negative tests for currency duplicates, missing base currency, DRAFT access.
 */
function checkNegativePath(): CheckResult[] {
  const withoutBase = MANDATORY_SETUP_STEPS.filter(
    (step) => step !== SETUP_STEPS.BASE_CURRENCY
  );

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
  ];
}

/**
 * Resume test: save progress then resume from last completed step.
 */
function checkResumePath(): CheckResult[] {
  const afterWelcome = applyCompletedStep([], SETUP_STEPS.WELCOME);
  const afterDetails = applyCompletedStep(
    afterWelcome.completedSteps,
    SETUP_STEPS.BUSINESS_DETAILS
  );
  const resume = resolveResumeStep(afterDetails.completedSteps);

  return [
    {
      name: "resume:saveProgressTracksLastCompleted",
      ok: afterDetails.lastCompletedStep === SETUP_STEPS.BUSINESS_DETAILS,
    },
    {
      name: "resume:resumeFromLastCompletedStep",
      ok: resume === SETUP_STEPS.COUNTRY,
      detail: `expected country, got ${resume}`,
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
  console.log("Running IP-006 Business Activation & Configuration smoke validation...");
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
