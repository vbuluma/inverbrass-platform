/**
 * Purpose:
 * Map Platform Registration UI fields to the OnboardingService payload.
 *
 * Design rationale:
 * When proposed business name is absent, display names default to Platform User.
 * Email remains optional.
 */

import type {
  OwnerRegistrationPayload,
  OwnerRegistrationUiPayload,
} from "@/core/auth/types";

export function mapRegistrationUiToOwnerPayload(
  ui: OwnerRegistrationUiPayload
): OwnerRegistrationPayload {
  const proposed = ui.businessName?.trim() ?? "";
  const nameParts = proposed.length > 0 ? proposed.split(/\s+/) : [];
  const firstName = nameParts[0] ?? "Platform";
  const lastName =
    nameParts.length > 1 ? nameParts.slice(1).join(" ") : "User";

  return {
    firstName,
    lastName,
    mobileNumber: ui.mobileNumber,
    countryCode: ui.countryCode,
    email: ui.email?.trim() ?? "",
    password: ui.password,
    confirmPassword: ui.confirmPassword,
    securityQuestionId: ui.securityQuestionId,
    securityAnswer: ui.securityAnswer,
    businessName: proposed,
  };
}
