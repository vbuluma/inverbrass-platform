/**
 * Purpose:
 * Compatibility re-export of enterprise phone normalization (EDS-003).
 *
 * Canonical implementation:
 * `@/core/shared/phone`
 *
 * Existing Platform Registration / Auth / Setup imports may continue to use
 * this path; new modules should import from `@/core/shared/phone`.
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
} from "@/core/shared/phone";
