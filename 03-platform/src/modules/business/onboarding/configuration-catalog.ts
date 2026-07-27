/**
 * Purpose:
 * Shared Business Configuration catalogue for Dashboard + Business Settings.
 *
 * Design rationale:
 * One metadata list drives clickable progress and settings navigation so
 * onboarding and maintenance stay a single source of truth.
 */

import { SETUP_STEPS } from "@/modules/business/onboarding/constants";

export type ConfigurationCatalogItem = {
  id: string;
  label: string;
  /** Setup step reused for edit (manage mode). */
  setupStep: string | null;
  href: string;
  group:
    | "profile"
    | "classification"
    | "locale"
    | "operations"
    | "branches"
    | "employees"
    | "tax"
    | "receipts"
    | "ai"
    | "loyalty"
    | "integrations"
    | "security"
    | "onboarding-profile";
};

/** Permanent Business Settings sections — reuse setup steps via manage mode. */
export const BUSINESS_SETTINGS_SECTIONS: ConfigurationCatalogItem[] = [
  {
    id: "profile",
    label: "Business Profile",
    setupStep: SETUP_STEPS.BUSINESS_PROFILE,
    href: `/setup/${SETUP_STEPS.BUSINESS_PROFILE}?manage=1`,
    group: "profile",
  },
  {
    id: "classification",
    label: "Classification",
    setupStep: SETUP_STEPS.BUSINESS_CLASSIFICATION,
    href: `/setup/${SETUP_STEPS.BUSINESS_CLASSIFICATION}?manage=1`,
    group: "classification",
  },
  {
    id: "country-currency",
    label: "Country & Currency",
    setupStep: SETUP_STEPS.COUNTRY,
    href: `/setup/${SETUP_STEPS.COUNTRY}?manage=1`,
    group: "locale",
  },
  {
    id: "operations",
    label: "Business Operations",
    setupStep: SETUP_STEPS.BUSINESS_OPERATIONS,
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
    group: "operations",
  },
  {
    id: "branches",
    label: "Branches",
    setupStep: SETUP_STEPS.BRANCH_SETUP,
    href: `/setup/${SETUP_STEPS.BRANCH_SETUP}?manage=1`,
    group: "branches",
  },
  {
    id: "employees",
    label: "Employees",
    setupStep: SETUP_STEPS.EMPLOYEE_SETUP,
    href: `/setup/${SETUP_STEPS.EMPLOYEE_SETUP}?manage=1`,
    group: "employees",
  },
  {
    id: "tax",
    label: "Tax",
    setupStep: SETUP_STEPS.BUSINESS_OPERATIONS,
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
    group: "tax",
  },
  {
    id: "receipts",
    label: "Receipts",
    setupStep: SETUP_STEPS.BUSINESS_OPERATIONS,
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
    group: "receipts",
  },
  {
    id: "ai",
    label: "AI Assistant",
    setupStep: SETUP_STEPS.BUSINESS_OPERATIONS,
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
    group: "ai",
  },
  {
    id: "loyalty",
    label: "Loyalty Programme",
    setupStep: SETUP_STEPS.BUSINESS_OPERATIONS,
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
    group: "loyalty",
  },
  {
    id: "integrations",
    label: "Integrations",
    setupStep: null,
    href: "/settings#integrations",
    group: "integrations",
  },
  {
    id: "security",
    label: "Security",
    setupStep: null,
    href: "/settings#security",
    group: "security",
  },
  {
    id: "onboarding-profile",
    label: "Onboarding Profile",
    setupStep: null,
    href: "/settings#onboarding-profile",
    group: "onboarding-profile",
  },
];

/** Dashboard Business Configuration progress rows (subset + clickable). */
export const DASHBOARD_CONFIGURATION_ITEMS: Array<{
  id: string;
  label: string;
  href: string;
}> = [
  {
    id: "profile",
    label: "Business Profile",
    href: `/setup/${SETUP_STEPS.BUSINESS_PROFILE}?manage=1`,
  },
  {
    id: "classification",
    label: "Classification",
    href: `/setup/${SETUP_STEPS.BUSINESS_CLASSIFICATION}?manage=1`,
  },
  {
    id: "country",
    label: "Country",
    href: `/setup/${SETUP_STEPS.COUNTRY}?manage=1`,
  },
  {
    id: "currency",
    label: "Base Currency",
    href: `/setup/${SETUP_STEPS.BASE_CURRENCY}?manage=1`,
  },
  {
    id: "branches",
    label: "Branches",
    href: `/setup/${SETUP_STEPS.BRANCH_SETUP}?manage=1`,
  },
  {
    id: "employees",
    label: "Employees",
    href: `/setup/${SETUP_STEPS.EMPLOYEE_SETUP}?manage=1`,
  },
  {
    id: "tax",
    label: "Tax",
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
  },
  {
    id: "receipts",
    label: "Receipts",
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
  },
  {
    id: "ai",
    label: "AI Assistant",
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
  },
  {
    id: "loyalty",
    label: "Loyalty",
    href: `/setup/${SETUP_STEPS.BUSINESS_OPERATIONS}?manage=1`,
  },
];
