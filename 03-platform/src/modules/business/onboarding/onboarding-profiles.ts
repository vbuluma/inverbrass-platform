/**
 * Purpose:
 * Metadata-driven onboarding profiles for ONE setup engine (Express / Standard / Enterprise).
 *
 * Design rationale:
 * Profiles configure mandatory vs optional steps and dashboard completion cues.
 * They do not create parallel onboarding products — Business Settings reuses the same steps.
 *
 * Implementation Package:
 * BP-001 Final UX Alignment
 */

import {
  SETUP_STEPS,
  type SetupStep,
} from "@/modules/business/onboarding/constants";

export const ONBOARDING_PROFILES = {
  EXPRESS: "express",
  STANDARD: "standard",
  ENTERPRISE: "enterprise",
} as const;

export type OnboardingProfileCode =
  (typeof ONBOARDING_PROFILES)[keyof typeof ONBOARDING_PROFILES];

export const ONBOARDING_PROFILE_LABELS: Record<OnboardingProfileCode, string> = {
  [ONBOARDING_PROFILES.EXPRESS]: "Express",
  [ONBOARDING_PROFILES.STANDARD]: "Standard",
  [ONBOARDING_PROFILES.ENTERPRISE]: "Enterprise",
};

/**
 * WHAT: Default profile inference from Business Type code (metadata).
 * WHY: Owners get a sensible path at Create Business; they can change it later.
 */
export const BUSINESS_TYPE_DEFAULT_PROFILE: Record<
  string,
  OnboardingProfileCode
> = {
  // Express — micro / quick-start SMEs
  RETAIL: ONBOARDING_PROFILES.EXPRESS,
  WHOLESALE: ONBOARDING_PROFILES.EXPRESS,
  CAR_WASH: ONBOARDING_PROFILES.EXPRESS,
  SALON: ONBOARDING_PROFILES.EXPRESS,
  GROCERY: ONBOARDING_PROFILES.EXPRESS,
  KIOSK: ONBOARDING_PROFILES.EXPRESS,

  // Standard — mid-complexity operations
  RESTAURANT: ONBOARDING_PROFILES.STANDARD,
  HOTEL: ONBOARDING_PROFILES.STANDARD,
  PHARMACY: ONBOARDING_PROFILES.STANDARD,
  CLINIC: ONBOARDING_PROFILES.STANDARD,

  // Enterprise — full current onboarding
  SCHOOL: ONBOARDING_PROFILES.ENTERPRISE,
  COLLEGE: ONBOARDING_PROFILES.ENTERPRISE,
  HOSPITAL: ONBOARDING_PROFILES.ENTERPRISE,
  PROPERTY_MANAGER: ONBOARDING_PROFILES.ENTERPRISE,
  ESTATE_AGENT: ONBOARDING_PROFILES.ENTERPRISE,
  MANUFACTURING: ONBOARDING_PROFILES.ENTERPRISE,
};

/** Full catalogue order — Enterprise path (current BP-001). */
const ENTERPRISE_MANDATORY: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_PROFILE,
  SETUP_STEPS.BUSINESS_CLASSIFICATION,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.BUSINESS_OPERATIONS,
  SETUP_STEPS.BRANCH_SETUP,
  SETUP_STEPS.REVIEW,
];

const ENTERPRISE_OPTIONAL: SetupStep[] = [
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.EMPLOYEE_SETUP,
];

/** Standard — currency + branches + employees required; ops polish optional. */
const STANDARD_MANDATORY: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_PROFILE,
  SETUP_STEPS.BUSINESS_CLASSIFICATION,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.BRANCH_SETUP,
  SETUP_STEPS.EMPLOYEE_SETUP,
  SETUP_STEPS.REVIEW,
];

const STANDARD_OPTIONAL: SetupStep[] = [
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.BUSINESS_OPERATIONS,
];

/**
 * Express — operational in minutes.
 * Base currency auto-applied from country; operations deferred to Business Settings.
 */
const EXPRESS_MANDATORY: SetupStep[] = [
  SETUP_STEPS.WELCOME,
  SETUP_STEPS.BUSINESS_PROFILE,
  SETUP_STEPS.BUSINESS_CLASSIFICATION,
  SETUP_STEPS.COUNTRY,
  SETUP_STEPS.BRANCH_SETUP,
  SETUP_STEPS.REVIEW,
];

const EXPRESS_OPTIONAL: SetupStep[] = [
  SETUP_STEPS.BASE_CURRENCY,
  SETUP_STEPS.ADDITIONAL_CURRENCIES,
  SETUP_STEPS.BUSINESS_OPERATIONS,
  SETUP_STEPS.EMPLOYEE_SETUP,
];

export type OnboardingProfileDefinition = {
  code: OnboardingProfileCode;
  label: string;
  estimatedMinutes: string;
  mandatorySteps: SetupStep[];
  optionalSteps: SetupStep[];
  /** Dashboard post-activation CTA emphasis. */
  postActivationCta: "products" | "configuration";
};

export const ONBOARDING_PROFILE_DEFINITIONS: Record<
  OnboardingProfileCode,
  OnboardingProfileDefinition
> = {
  [ONBOARDING_PROFILES.EXPRESS]: {
    code: ONBOARDING_PROFILES.EXPRESS,
    label: ONBOARDING_PROFILE_LABELS.express,
    estimatedMinutes: "3–5 minutes",
    mandatorySteps: EXPRESS_MANDATORY,
    optionalSteps: EXPRESS_OPTIONAL,
    postActivationCta: "products",
  },
  [ONBOARDING_PROFILES.STANDARD]: {
    code: ONBOARDING_PROFILES.STANDARD,
    label: ONBOARDING_PROFILE_LABELS.standard,
    estimatedMinutes: "10–15 minutes",
    mandatorySteps: STANDARD_MANDATORY,
    optionalSteps: STANDARD_OPTIONAL,
    postActivationCta: "configuration",
  },
  [ONBOARDING_PROFILES.ENTERPRISE]: {
    code: ONBOARDING_PROFILES.ENTERPRISE,
    label: ONBOARDING_PROFILE_LABELS.enterprise,
    estimatedMinutes: "about 10 minutes",
    mandatorySteps: ENTERPRISE_MANDATORY,
    optionalSteps: ENTERPRISE_OPTIONAL,
    postActivationCta: "configuration",
  },
};

export function isOnboardingProfileCode(
  value: string | null | undefined
): value is OnboardingProfileCode {
  return (
    value === ONBOARDING_PROFILES.EXPRESS ||
    value === ONBOARDING_PROFILES.STANDARD ||
    value === ONBOARDING_PROFILES.ENTERPRISE
  );
}

export function resolveDefaultOnboardingProfile(
  businessTypeCode: string | null | undefined
): OnboardingProfileCode {
  if (!businessTypeCode) {
    return ONBOARDING_PROFILES.STANDARD;
  }
  return (
    BUSINESS_TYPE_DEFAULT_PROFILE[businessTypeCode.toUpperCase()] ??
    ONBOARDING_PROFILES.STANDARD
  );
}

export function getOnboardingProfileDefinition(
  profile: OnboardingProfileCode
): OnboardingProfileDefinition {
  return ONBOARDING_PROFILE_DEFINITIONS[profile];
}

export function getMandatoryStepsForProfile(
  profile: OnboardingProfileCode
): SetupStep[] {
  return [...getOnboardingProfileDefinition(profile).mandatorySteps];
}

export function getOptionalStepsForProfile(
  profile: OnboardingProfileCode
): SetupStep[] {
  return [...getOnboardingProfileDefinition(profile).optionalSteps];
}

export function isStepOptionalForProfile(
  profile: OnboardingProfileCode,
  step: SetupStep
): boolean {
  return getOptionalStepsForProfile(profile).includes(step);
}

export function areMandatoryStepsCompleteForProfile(
  profile: OnboardingProfileCode,
  completedSteps: SetupStep[]
): boolean {
  return getMandatoryStepsForProfile(profile).every((step) =>
    completedSteps.includes(step)
  );
}

/**
 * WHAT: Resume pointer that skips profile-optional steps when navigating forward.
 * WHY: Express owners should not be forced through tax/receipts before activation.
 */
export function resolveResumeStepForProfile(
  profile: OnboardingProfileCode,
  completedSteps: SetupStep[],
  stepOrder: SetupStep[]
): SetupStep {
  const mandatory = new Set(getMandatoryStepsForProfile(profile));
  const optional = new Set(getOptionalStepsForProfile(profile));

  for (const step of stepOrder) {
    if (completedSteps.includes(step)) {
      continue;
    }
    // Skip optional steps when seeking the next required resume point.
    if (optional.has(step) && !mandatory.has(step)) {
      continue;
    }
    return step;
  }

  return SETUP_STEPS.REVIEW;
}
