/**
 * Purpose:
 * Shared user-facing messages when platform reference catalogues are empty.
 *
 * Design rationale:
 * Lookup services return empty collections safely; UI must show one consistent
 * message without embedding catalogue rules in each form.
 *
 * Business rationale:
 * Smoke-test gaps showed blank selectors when seed data was missing. Friendly
 * messaging prevents silent failure during registration and setup.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

export const CATALOG_EMPTY_MESSAGES = {
  countries:
    "Country options are not available right now. Please try again later or contact support.",
  industries:
    "Industry solutions are not available right now. Please try again later or contact support.",
  businessTypes:
    "Business template options are not available right now. Please try again later or contact support.",
  businessTemplatesForIndustry:
    "No business templates are available for the selected industry solution. Choose another industry or contact support.",
  securityQuestions:
    "Security questions are not available right now. Please try again later or contact support.",
  currencies:
    "Currency options are not available right now. Please try again later or contact support.",
  generic:
    "Required platform reference data is not available right now. Please try again later or contact support.",
} as const;
