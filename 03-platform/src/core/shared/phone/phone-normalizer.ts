/**
 * Purpose:
 * Enterprise telephone normalization to canonical E.164.
 *
 * Enterprise Data Standard:
 * EDS-003 – All telephone numbers shall be stored in canonical E.164 format.
 * User input may be local or international; the platform normalizes before
 * validation, duplicate detection, integration, and persistence.
 *
 * Design rationale:
 * Single shared utility for Platform Registration, Party Contacts, Employees,
 * Branches, Customers, Suppliers, and all future Build Packs. Prefer dialing
 * codes from Localization (country.phone_code) when callers supply them.
 */

export type CountryPhoneRule = {
  countryCode: string;
  dialCode: string;
  nationalNumberLength: number;
  nationalNumberPattern: RegExp;
};

/**
 * Built-in national mobile rules for operating markets.
 * Dial codes must match Localization country.phone_code (without "+").
 * When Localization supplies dialCode, it takes precedence for prefixing.
 */
const COUNTRY_PHONE_RULES: Record<string, CountryPhoneRule> = {
  KE: {
    countryCode: "KE",
    dialCode: "254",
    nationalNumberLength: 9,
    nationalNumberPattern: /^[17]\d{8}$/,
  },
  UG: {
    countryCode: "UG",
    dialCode: "256",
    nationalNumberLength: 9,
    nationalNumberPattern: /^[37]\d{8}$/,
  },
  TZ: {
    countryCode: "TZ",
    dialCode: "255",
    nationalNumberLength: 9,
    nationalNumberPattern: /^[67]\d{8}$/,
  },
  RW: {
    countryCode: "RW",
    dialCode: "250",
    nationalNumberLength: 9,
    nationalNumberPattern: /^[7]\d{8}$/,
  },
};

export type PhoneNormalizeOptions = {
  /** ISO 3166-1 alpha-2 (e.g. KE). */
  countryCode: string;
  /**
   * Dialing code from Localization & Regulatory Engine (e.g. "+254" or "254").
   * When provided, used as the country calling code for normalization.
   */
  dialCode?: string | null;
};

export function getCountryPhoneRule(
  countryCode: string
): CountryPhoneRule | undefined {
  return COUNTRY_PHONE_RULES[countryCode.toUpperCase()];
}

/**
 * WHAT: Strip spaces, hyphens, parentheses, dots, and other separators.
 * WHY: Accept formatted variants while preserving a leading "+" when present.
 */
export function stripPhoneFormatting(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return "";
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function resolveDialCode(
  countryCode: string,
  localizationDialCode?: string | null
): string {
  if (localizationDialCode && localizationDialCode.trim()) {
    return localizationDialCode.trim().replace(/[^\d]/g, "");
  }

  const rule = getCountryPhoneRule(countryCode);
  if (rule) {
    return rule.dialCode;
  }

  throw new Error(`Unsupported country code "${countryCode}".`);
}

function isValidNationalNumber(
  countryCode: string,
  dialCode: string,
  nationalNumber: string
): boolean {
  const rule = getCountryPhoneRule(countryCode);
  if (rule && rule.dialCode === dialCode) {
    return (
      nationalNumber.length === rule.nationalNumberLength &&
      rule.nationalNumberPattern.test(nationalNumber)
    );
  }

  // Generic E.164 national segment when Localization dial code has no local rule.
  return (
    nationalNumber.length >= 4 &&
    nationalNumber.length <= 14 &&
    /^\d+$/.test(nationalNumber)
  );
}

/**
 * WHAT: Normalize any accepted phone input to canonical E.164 (+CCNSN).
 * WHY: EDS-003 — one storage form for duplicate detection and integrations.
 *
 * Accepts examples (KE / +254):
 * 0722134343, 722134343, 254722134343, +254722134343, (0722) 134-343
 */
export function normalizePhoneNumberToE164(
  rawInput: string,
  countryCodeOrOptions: string | PhoneNormalizeOptions
): string {
  const options: PhoneNormalizeOptions =
    typeof countryCodeOrOptions === "string"
      ? { countryCode: countryCodeOrOptions }
      : countryCodeOrOptions;

  const countryCode = options.countryCode.trim().toUpperCase();
  if (!countryCode) {
    throw new Error("Country code is required to normalize a phone number.");
  }

  const stripped = stripPhoneFormatting(rawInput);
  if (!stripped) {
    throw new Error(`Enter a valid phone number for ${countryCode}.`);
  }

  const dialCode = resolveDialCode(countryCode, options.dialCode);

  let digits = stripped;
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = `${dialCode}${digits.slice(1)}`;
  } else if (digits.startsWith(dialCode)) {
    // already international without +
  } else {
    digits = `${dialCode}${digits}`;
  }

  if (!digits.startsWith(dialCode)) {
    throw new Error(`Enter a valid phone number for ${countryCode}.`);
  }

  const nationalNumber = digits.slice(dialCode.length);
  if (!isValidNationalNumber(countryCode, dialCode, nationalNumber)) {
    throw new Error(`Enter a valid phone number for ${countryCode}.`);
  }

  // E.164 max 15 digits excluding "+"
  const e164Digits = `${dialCode}${nationalNumber}`;
  if (e164Digits.length < 8 || e164Digits.length > 15) {
    throw new Error(`Enter a valid phone number for ${countryCode}.`);
  }

  return `+${e164Digits}`;
}

/**
 * WHAT: Backward-compatible alias used by Platform Registration and Setup.
 * WHY: Existing call sites pass ISO country code; behavior matches EDS-003.
 */
export function normalizeMobileNumber(
  rawInput: string,
  countryCode: string
): string {
  return normalizePhoneNumberToE164(rawInput, countryCode);
}

/**
 * WHAT: True when the contact type stores a telephone channel.
 * WHY: Party Contacts and future packs only E.164-normalize phone-like types.
 */
export function isTelephoneContactType(contactTypeCode: string): boolean {
  return (
    contactTypeCode === "MOBILE" ||
    contactTypeCode === "OFFICE_PHONE" ||
    contactTypeCode === "HOME_PHONE" ||
    contactTypeCode === "WHATSAPP" ||
    contactTypeCode === "FAX" ||
    contactTypeCode === "EMERGENCY"
  );
}

export function toAuthEmailAlias(phoneNumberE164: string): string {
  const normalized = phoneNumberE164.replace("+", "");
  return `${normalized}@mobile.inverbrass.internal`;
}

/**
 * WHAT: Infer ISO country code from an E.164 mobile stored at Platform Registration.
 * WHY: Prefill Create Business / Setup country without a separate persisted country column.
 */
export function inferCountryCodeFromE164(
  phoneNumberE164: string | null | undefined
): string | null {
  if (!phoneNumberE164) {
    return null;
  }

  const digits = phoneNumberE164.trim().replace(/^\+/, "");

  // Prefer longest dial-code match (e.g. 254 before 2).
  const rules = Object.values(COUNTRY_PHONE_RULES).sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const rule of rules) {
    if (digits.startsWith(rule.dialCode)) {
      return rule.countryCode;
    }
  }

  return null;
}
