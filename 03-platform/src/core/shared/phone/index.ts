/**
 * Purpose:
 * Public exports for enterprise phone normalization (EDS-003).
 */

export {
  getCountryPhoneRule,
  inferCountryCodeFromE164,
  isTelephoneContactType,
  normalizeMobileNumber,
  normalizePhoneNumberToE164,
  stripPhoneFormatting,
  toAuthEmailAlias,
  type CountryPhoneRule,
  type PhoneNormalizeOptions,
} from "@/core/shared/phone/phone-normalizer";
