/**
 * Purpose:
 * Pure business-rule helpers for the Business Activation & Configuration Wizard.
 *
 * WHY:
 * Keeps deterministic rule evaluation outside DB/UI so smoke tests and the
 * service share one source of truth for resume, activation, and currency rules.
 *
 * RATIONALE:
 * Extracting pure functions avoids duplicating rule logic in smoke scripts and
 * prevents accidental drift when the wizard catalogue evolves.
 *
 * Implementation Package:
 * BP-001 / IP-006 – Business Activation & Configuration Wizard
 */

import { BUSINESS_STATUS } from "@/core/auth/constants";
import {
  MANDATORY_SETUP_STEPS,
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import type {
  BusinessConfigurationSettings,
  BusinessConfigurationView,
  PaymentMethodsPayload,
} from "@/modules/business/onboarding/types";

const LEGACY_OPERATIONS_STEPS: SetupStep[] = [
  SETUP_STEPS.PAYMENT_METHODS,
  SETUP_STEPS.RECEIPT_CONFIGURATION,
  SETUP_STEPS.AI_TOGGLE,
  SETUP_STEPS.LOYALTY_TOGGLE,
];

/**
 * WHAT: Normalize legacy step codes into the current wizard catalogue.
 * WHY: In-flight DRAFT progress may still contain v1 step identifiers.
 */
export function normalizeSetupStep(value: string): SetupStep | null {
  if (value === SETUP_STEPS.BUSINESS_DETAILS) {
    return SETUP_STEPS.BUSINESS_PROFILE;
  }

  if (LEGACY_OPERATIONS_STEPS.includes(value as SetupStep)) {
    return SETUP_STEPS.BUSINESS_OPERATIONS;
  }

  if (
    SETUP_STEP_ORDER.includes(value as SetupStep) ||
    value === SETUP_STEPS.COMPLETED
  ) {
    return value as SetupStep;
  }

  return null;
}

export function isSetupStep(value: string): value is SetupStep {
  return normalizeSetupStep(value) !== null;
}

/**
 * WHAT: Deduplicate and normalize step codes.
 * WHY: Progress JSON may accumulate repeats after retries / version upgrades.
 */
export function uniqueSteps(steps: string[]): SetupStep[] {
  const result: SetupStep[] = [];

  for (const step of steps) {
    const normalized = normalizeSetupStep(step);
    if (normalized && normalized !== SETUP_STEPS.COMPLETED && !result.includes(normalized)) {
      result.push(normalized);
    }
  }

  return result;
}

/**
 * WHAT: Resolve the next incomplete wizard step for resume.
 * WHY: BR-009 — returning users continue from the last incomplete step.
 */
export function resolveResumeStep(completedSteps: SetupStep[]): SetupStep {
  for (const step of SETUP_STEP_ORDER) {
    if (!completedSteps.includes(step)) {
      return step;
    }
  }

  return SETUP_STEPS.REVIEW;
}

/**
 * WHAT: Compute setup completion percentage.
 * WHY: FR-002 — progress indicator needs a stable ratio.
 */
export function calculateProgressPercent(completedSteps: SetupStep[]): number {
  const total = SETUP_STEP_ORDER.length;
  const completed = SETUP_STEP_ORDER.filter((step) =>
    completedSteps.includes(step)
  ).length;

  return Math.round((completed / total) * 100);
}

/**
 * WHAT: Determine whether mandatory steps (including base currency) are done.
 * WHY: BR-008 — activation is blocked until mandatory steps complete.
 */
export function areMandatoryStepsComplete(completedSteps: SetupStep[]): boolean {
  return MANDATORY_SETUP_STEPS.every((step) => completedSteps.includes(step));
}

/**
 * WHAT: Confirm the mandatory base-currency step is present in progress.
 * WHY: BR-004 / BR-008 — activation is rejected without base currency.
 */
export function hasCompletedBaseCurrencyStep(
  completedSteps: SetupStep[]
): boolean {
  return completedSteps.includes(SETUP_STEPS.BASE_CURRENCY);
}

/**
 * WHAT: Detect duplicate operating currency against the base.
 * WHY: BR-005 — duplicate currencies are not allowed.
 */
export function hasDuplicateOperatingCurrency(
  baseCurrencyCode: string,
  additionalCurrencyCodes: string[]
): boolean {
  const normalizedBase = baseCurrencyCode.toUpperCase();
  const normalizedAdditional = additionalCurrencyCodes.map((code) =>
    code.toUpperCase()
  );

  if (normalizedAdditional.includes(normalizedBase)) {
    return true;
  }

  return new Set(normalizedAdditional).size !== normalizedAdditional.length;
}

/**
 * WHAT: Gate operational Build Pack access by business status.
 * WHY: BR-013 — only ACTIVE businesses may access operational modules.
 */
export function isOperationalAccessAllowed(businessStatusCode: string): boolean {
  return businessStatusCode === BUSINESS_STATUS.ACTIVE;
}

/**
 * WHAT: Apply a completed step and return updated progress fields.
 * WHY: Centralizes resume + last-completed bookkeeping for service and smoke.
 */
export function applyCompletedStep(
  existingCompletedSteps: string[],
  step: SetupStep
): {
  completedSteps: SetupStep[];
  lastCompletedStep: SetupStep;
  resumeStep: SetupStep;
  progressPercent: number;
} {
  const completedSteps = uniqueSteps(existingCompletedSteps);

  if (!completedSteps.includes(step)) {
    completedSteps.push(step);
  }

  const resumeStep = resolveResumeStep(completedSteps);

  return {
    completedSteps,
    lastCompletedStep: step,
    resumeStep,
    progressPercent: calculateProgressPercent(completedSteps),
  };
}

/**
 * WHAT: Default configuration metadata document for a new business.
 * WHY: Optional groups need safe defaults before the owner saves each step.
 */
export function createDefaultConfigurationSettings(): BusinessConfigurationSettings {
  return {
    paymentMethods: {
      cashEnabled: true,
      mobileMoneyEnabled: true,
      bankTransferEnabled: false,
      cardEnabled: false,
      creditSalesEnabled: false,
    },
    receipt: {
      receiptPrefix: "RCPT",
      receiptFooter: "",
      showLogoOnReceipt: true,
    },
    tax: {
      taxEnabled: false,
      defaultTaxRate: "0",
    },
    features: {
      aiAssistantEnabled: false,
      loyaltyProgrammeEnabled: false,
    },
  };
}

/**
 * WHAT: Deep-merge a partial settings patch into the stored document.
 * WHY: Each wizard step updates only its group without wiping siblings.
 */
export function mergeConfigurationSettings(
  current: BusinessConfigurationSettings,
  patch: Partial<BusinessConfigurationSettings>
): BusinessConfigurationSettings {
  return {
    paymentMethods: patch.paymentMethods ?? current.paymentMethods,
    receipt: patch.receipt ?? current.receipt,
    tax: patch.tax ?? current.tax,
    features: {
      aiAssistantEnabled:
        patch.features?.aiAssistantEnabled ?? current.features.aiAssistantEnabled,
      loyaltyProgrammeEnabled:
        patch.features?.loyaltyProgrammeEnabled ??
        current.features.loyaltyProgrammeEnabled,
    },
  };
}

/**
 * WHAT: Flatten settings metadata for presentation/review layers.
 * WHY: UI remains presentation-only and does not navigate nested settings.
 */
export function toConfigurationView(
  settings: BusinessConfigurationSettings
): BusinessConfigurationView {
  return {
    cashEnabled: settings.paymentMethods.cashEnabled,
    mobileMoneyEnabled: settings.paymentMethods.mobileMoneyEnabled,
    bankTransferEnabled: settings.paymentMethods.bankTransferEnabled,
    cardEnabled: settings.paymentMethods.cardEnabled,
    creditSalesEnabled: settings.paymentMethods.creditSalesEnabled,
    receiptPrefix: settings.receipt.receiptPrefix,
    receiptFooter: settings.receipt.receiptFooter,
    showLogoOnReceipt: settings.receipt.showLogoOnReceipt,
    taxEnabled: settings.tax.taxEnabled,
    defaultTaxRate: settings.tax.defaultTaxRate,
    aiAssistantEnabled: settings.features.aiAssistantEnabled,
    loyaltyProgrammeEnabled: settings.features.loyaltyProgrammeEnabled,
  };
}

/**
 * WHAT: Simulate happy-path step completion order for smoke validation.
 * WHY: Deterministic coverage of register→setup→activate eligibility without DB.
 */
export function simulateHappyPathCompletedSteps(): SetupStep[] {
  return [...SETUP_STEP_ORDER];
}

/**
 * WHAT: Simulate optional skips while keeping mandatory steps.
 * WHY: Optional steps may be skipped yet activation remains valid.
 */
export function simulateOptionalSkipCompletedSteps(): SetupStep[] {
  return MANDATORY_SETUP_STEPS.filter(
    (step) =>
      step !== SETUP_STEPS.ADDITIONAL_CURRENCIES &&
      step !== SETUP_STEPS.EMPLOYEE_SETUP
  );
}

export function paymentMethodsFromView(
  view: Pick<
    BusinessConfigurationView,
    | "cashEnabled"
    | "mobileMoneyEnabled"
    | "bankTransferEnabled"
    | "cardEnabled"
    | "creditSalesEnabled"
  >
): PaymentMethodsPayload {
  return {
    cashEnabled: view.cashEnabled,
    mobileMoneyEnabled: view.mobileMoneyEnabled,
    bankTransferEnabled: view.bankTransferEnabled,
    cardEnabled: view.cardEnabled,
    creditSalesEnabled: view.creditSalesEnabled,
  };
}

/**
 * WHAT: Build a branch-code candidate from a branch name.
 * WHY: Branch codes are auto-generated and editable — format stays stable.
 */
export function buildBranchCodeCandidate(branchName: string): string {
  const slug = branchName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);

  return `${slug || "BRN"}-01`.slice(0, 30);
}
