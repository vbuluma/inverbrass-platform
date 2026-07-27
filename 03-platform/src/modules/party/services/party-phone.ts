/**
 * Purpose:
 * Resolve Business Localization dialing context and normalize Party phones (EDS-003).
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication (enterprise phone standard)
 */

import {
  isTelephoneContactType,
  normalizePhoneNumberToE164,
} from "@/core/shared/phone";
import { PartyError, PARTY_USER_MESSAGES } from "@/modules/party/errors";
import type { PartyReferenceRepository } from "@/modules/party/repositories/party-reference-repository";

export type BusinessPhoneContext = {
  countryCode: string;
  dialCode: string;
};

/**
 * WHAT: Load operating country + Localization dial code for a Business.
 * WHY: EDS-003 requires Party/Business country dialing code before persistence.
 */
export async function requireBusinessPhoneContext(
  referenceRepository: PartyReferenceRepository,
  businessId: string
): Promise<BusinessPhoneContext> {
  const context =
    await referenceRepository.findBusinessPhoneContext(businessId);

  if (!context?.countryCode || !context.dialCode) {
    throw new PartyError(
      "REFERENCE_DATA_MISSING",
      "Business operating country dialing code is missing. Complete Business setup before managing phone contacts.",
      503
    );
  }

  return {
    countryCode: context.countryCode,
    dialCode: context.dialCode,
  };
}

/**
 * WHAT: Normalize telephone contact values to E.164; leave other types unchanged.
 * WHY: Central EDS-003 enforcement for Party Contacts and registration.
 */
export function normalizePartyContactValue(
  contactTypeCode: string,
  contactValue: string,
  phoneContext: BusinessPhoneContext
): string {
  const trimmed = contactValue.trim();

  if (!isTelephoneContactType(contactTypeCode)) {
    return trimmed;
  }

  try {
    return normalizePhoneNumberToE164(trimmed, {
      countryCode: phoneContext.countryCode,
      dialCode: phoneContext.dialCode,
    });
  } catch {
    throw new PartyError(
      "INVALID_INPUT",
      `Enter a valid phone number for ${phoneContext.countryCode}.`,
      400,
      "contactValue"
    );
  }
}

/**
 * WHAT: Normalize a registration mobile using Business Localization dial code.
 */
export function normalizeRegistrationMobile(
  mobile: string,
  phoneContext: BusinessPhoneContext,
  field = "mobile"
): string {
  try {
    return normalizePhoneNumberToE164(mobile.trim(), {
      countryCode: phoneContext.countryCode,
      dialCode: phoneContext.dialCode,
    });
  } catch {
    throw new PartyError(
      "INVALID_INPUT",
      PARTY_USER_MESSAGES.MOBILE_REQUIRED,
      400,
      field
    );
  }
}
