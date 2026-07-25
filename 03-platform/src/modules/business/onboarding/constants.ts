/**
 * Purpose:
 * Define setup wizard step catalogue, mandatory/optional classification, and
 * wizard version for progress auditability.
 *
 * Design rationale:
 * Step codes drive UI routing, resume logic, and activation gates. Wizard
 * version isolates future catalogue changes from historical progress rows.
 *
 * Business rationale:
 * Configuration-driven onboarding keeps activation gates consistent across
 * environments; welcome copy is validated at startup (IP-006A).
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * BP-001 / IP-006 – Business Activation & Platform Initialization
 */

export const SETUP_WIZARD_VERSION = "2.0.0";

/**
 * WHAT: When true, owners may override the country-derived base currency.
 * WHY: Base currency change is platform-configurable — not hardcoded UX.
 */
export const SETUP_ALLOW_BASE_CURRENCY_CHANGE = true;

/**
 * WHAT: Canonical welcome copy template for the setup Welcome step.
 * WHY: Startup validation and UI share one message so copy cannot drift.
 */
export const SETUP_WELCOME_MESSAGE =
  "Complete a short setup so {businessName} can start operating. You can pause anytime and resume later. Estimated time: about 10 minutes.";

/**
 * WHAT: Resolve welcome copy for a named business.
 * WHY: Keeps UI presentation aligned with the validated template.
 */
export function formatSetupWelcomeMessage(businessName: string): string {
  const name = businessName.trim() || "your business";
  return SETUP_WELCOME_MESSAGE.replace("{businessName}", name);
}

export const SETUP_STEPS = {
  WELCOME: "welcome",
  BUSINESS_PROFILE: "business-profile",
  /** @deprecated Prefer BUSINESS_PROFILE — kept for progress row normalization. */
  BUSINESS_DETAILS: "business-details",
  BUSINESS_CLASSIFICATION: "business-classification",
  COUNTRY: "country",
  BASE_CURRENCY: "base-currency",
  ADDITIONAL_CURRENCIES: "additional-currencies",
  BUSINESS_OPERATIONS: "business-operations",
  /** @deprecated Collapsed into BUSINESS_OPERATIONS. */
  PAYMENT_METHODS: "payment-methods",
  /** @deprecated Collapsed into BUSINESS_OPERATIONS. */
  RECEIPT_CONFIGURATION: "receipt-configuration",
  /** @deprecated Collapsed into BUSINESS_OPERATIONS. */
  AI_TOGGLE: "ai-toggle",
  /** @deprecated Collapsed into BUSINESS_OPERATIONS. */
  LOYALTY_TOGGLE: "loyalty-toggle",
  BRANCH_SETUP: "branch-setup",
  EMPLOYEE_SETUP: "employee-setup",
  REVIEW: "review",
  COMPLETED: "completed",
} as const;

export type SetupStep = (typeof SETUP_STEPS)[keyof typeof SETUP_STEPS];

export const SETUP_STEP_ORDER: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_PROFILE,
  SETUP_STEPS.BUSINESS_CLASSIFICATION,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.BUSINESS_OPERATIONS,
  SETUP_STEPS.BRANCH_SETUP,
  SETUP_STEPS.EMPLOYEE_SETUP,
  SETUP_STEPS.REVIEW,
];

export const MANDATORY_SETUP_STEPS: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_PROFILE,
  SETUP_STEPS.BUSINESS_CLASSIFICATION,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.BUSINESS_OPERATIONS,
  SETUP_STEPS.BRANCH_SETUP,
  SETUP_STEPS.REVIEW,
];

export const OPTIONAL_SETUP_STEPS: SetupStep[] = [
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.EMPLOYEE_SETUP,
];

export const SETUP_STEP_LABELS: Record<SetupStep, string> = {
  [SETUP_STEPS.WELCOME]: "Welcome",
  [SETUP_STEPS.BUSINESS_PROFILE]: "Business Profile",
  [SETUP_STEPS.BUSINESS_DETAILS]: "Business Profile",
  [SETUP_STEPS.BUSINESS_CLASSIFICATION]: "Business Classification",
  [SETUP_STEPS.COUNTRY]: "Operating Country",
  [SETUP_STEPS.BASE_CURRENCY]: "Base Currency",
  [SETUP_STEPS.ADDITIONAL_CURRENCIES]: "Additional Currencies",
  [SETUP_STEPS.BUSINESS_OPERATIONS]: "Business Operations",
  [SETUP_STEPS.PAYMENT_METHODS]: "Payment Methods",
  [SETUP_STEPS.RECEIPT_CONFIGURATION]: "Receipt Configuration",
  [SETUP_STEPS.AI_TOGGLE]: "AI Assistant",
  [SETUP_STEPS.LOYALTY_TOGGLE]: "Loyalty Programme",
  [SETUP_STEPS.BRANCH_SETUP]: "Branch Setup",
  [SETUP_STEPS.EMPLOYEE_SETUP]: "Employee Setup",
  [SETUP_STEPS.REVIEW]: "Review",
  [SETUP_STEPS.COMPLETED]: "Completed",
};

/**
 * WHAT: Platform roles assignable during employee setup.
 * WHY: Role catalogue is configuration-driven — OWNER is excluded from hire flow.
 */
export const EMPLOYEE_SETUP_ROLE_CODES = [
  "SUPERVISOR",
  "MAKER",
  "CHECKER",
  "EMPLOYEE",
] as const;

export type EmployeeSetupRoleCode =
  (typeof EMPLOYEE_SETUP_ROLE_CODES)[number];
