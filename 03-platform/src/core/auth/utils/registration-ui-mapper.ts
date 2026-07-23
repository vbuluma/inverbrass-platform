/**
 * Purpose:
 * Map IP-005 registration UI fields to the existing owner registration service payload.
 *
 * Business Context:
 * IP-002 established OwnerRegistrationPayload with extended owner/business contact fields.
 * IP-005 UI captures a reduced field set while preserving the approved service contract.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (§3.1)
 *
 * Implementation Package:
 * IP-005 – Authentication UI
 *
 * Responsibilities:
 * - Translate validated UI payload into OwnerRegistrationPayload
 *
 * Non-Responsibilities:
 * - Validation (registration-ui-validators)
 * - Registration orchestration (OnboardingService)
 *
 * Dependencies:
 * - OwnerRegistrationPayload, OwnerRegistrationUiPayload types
 *
 * Business Rules Implemented:
 * - AD-009 §3.1 — owner mobile doubles as initial business contact phone
 *
 * Extension Points:
 * - Additional UI fields may map here when registration expands
 */

import type {
  OwnerRegistrationPayload,
  OwnerRegistrationUiPayload,
} from "@/core/auth/types";

export function mapRegistrationUiToOwnerPayload(
  ui: OwnerRegistrationUiPayload
): OwnerRegistrationPayload {
  const nameParts = ui.businessName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "Business";
  const lastName =
    nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Owner";

  return {
    firstName,
    lastName,
    mobileNumber: ui.mobileNumber,
    countryCode: ui.countryCode,
    password: ui.password,
    confirmPassword: ui.confirmPassword,
    securityQuestionId: ui.securityQuestionId,
    securityAnswer: ui.securityAnswer,
    businessName: ui.businessName,
    businessTypeId: ui.businessTypeId,
    businessCountryCode: ui.countryCode,
    businessMobileNumber: ui.mobileNumber,
  };
}
