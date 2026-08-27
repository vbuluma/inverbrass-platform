/**
 * ENG-003j — Success copy for Business Setup Wizard steps.
 */

import { SETUP_STEPS, type SetupStep } from "@/modules/business/onboarding/constants";

const SETUP_STEP_SUCCESS_MESSAGES: Partial<Record<SetupStep, string>> = {
  [SETUP_STEPS.BUSINESS_PROFILE]: "Business details saved successfully.",
  [SETUP_STEPS.BUSINESS_CLASSIFICATION]: "Business classification saved successfully.",
  [SETUP_STEPS.COUNTRY]: "Country saved successfully.",
  [SETUP_STEPS.BASE_CURRENCY]: "Base currency saved successfully.",
  [SETUP_STEPS.ADDITIONAL_CURRENCIES]: "Additional currencies saved successfully.",
  [SETUP_STEPS.BUSINESS_OPERATIONS]: "Configuration saved successfully.",
  [SETUP_STEPS.BRANCH_SETUP]: "Branch setup saved successfully.",
  [SETUP_STEPS.EMPLOYEE_SETUP]: "Employees saved successfully.",
  [SETUP_STEPS.REVIEW]: "Review confirmed successfully.",
};

export function resolveSetupStepSuccessMessage(step: SetupStep): string {
  return SETUP_STEP_SUCCESS_MESSAGES[step] ?? "Successfully saved.";
}

export const SETUP_EMPLOYEE_CREATED_SUCCESS =
  "Employee(s) created successfully.";

export const SETUP_BRANCH_CREATED_SUCCESS = "Branch created successfully.";

export const SETUP_BUSINESS_CREATED_SUCCESS = "Business created successfully.";
