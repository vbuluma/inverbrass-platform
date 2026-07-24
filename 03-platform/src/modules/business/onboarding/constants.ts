/**
 * Purpose:
 * Define setup wizard step catalogue, mandatory/optional classification, and
 * wizard version for progress auditability.
 *
 * WHY:
 * Step codes drive UI routing, resume logic, and activation gates. Wizard
 * version isolates future catalogue changes from historical progress rows.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 */

export const SETUP_WIZARD_VERSION = "1.0.0";

export const SETUP_STEPS = {
  WELCOME: "welcome",
  BUSINESS_DETAILS: "business-details",
  COUNTRY: "country",
  BASE_CURRENCY: "base-currency",
  ADDITIONAL_CURRENCIES: "additional-currencies",
  PAYMENT_METHODS: "payment-methods",
  RECEIPT_CONFIGURATION: "receipt-configuration",
  AI_TOGGLE: "ai-toggle",
  LOYALTY_TOGGLE: "loyalty-toggle",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;

export type SetupStep = (typeof SETUP_STEPS)[keyof typeof SETUP_STEPS];

export const SETUP_STEP_ORDER: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_DETAILS,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.PAYMENT_METHODS,
  SETUP_STEPS.RECEIPT_CONFIGURATION,
  SETUP_STEPS.AI_TOGGLE,
  SETUP_STEPS.LOYALTY_TOGGLE,
  SETUP_STEPS.REVIEW,
];

export const MANDATORY_SETUP_STEPS: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_DETAILS,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.PAYMENT_METHODS,
  SETUP_STEPS.RECEIPT_CONFIGURATION,
  SETUP_STEPS.REVIEW,
];

export const OPTIONAL_SETUP_STEPS: SetupStep[] = [
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.AI_TOGGLE,
  SETUP_STEPS.LOYALTY_TOGGLE,
];

export const SETUP_STEP_LABELS: Record<SetupStep, string> = {
  [SETUP_STEPS.WELCOME]: "Welcome",
  [SETUP_STEPS.BUSINESS_DETAILS]: "Business Details",
  [SETUP_STEPS.COUNTRY]: "Country",
  [SETUP_STEPS.BASE_CURRENCY]: "Base Currency",
  [SETUP_STEPS.ADDITIONAL_CURRENCIES]: "Additional Currencies",
  [SETUP_STEPS.PAYMENT_METHODS]: "Payment Methods",
  [SETUP_STEPS.RECEIPT_CONFIGURATION]: "Receipt Configuration",
  [SETUP_STEPS.AI_TOGGLE]: "AI Assistant",
  [SETUP_STEPS.LOYALTY_TOGGLE]: "Loyalty Programme",
  [SETUP_STEPS.REVIEW]: "Review",
  [SETUP_STEPS.COMPLETED]: "Completed",
};
