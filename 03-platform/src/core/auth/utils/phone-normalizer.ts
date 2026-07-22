export type CountryPhoneRule = {
  countryCode: string;
  dialCode: string;
  nationalNumberLength: number;
  nationalNumberPattern: RegExp;
};

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
};

export function getCountryPhoneRule(
  countryCode: string
): CountryPhoneRule | undefined {
  return COUNTRY_PHONE_RULES[countryCode.toUpperCase()];
}

export function normalizeMobileNumber(
  rawInput: string,
  countryCode: string
): string {
  const trimmed = rawInput.trim().replace(/[\s-]/g, "");
  const rule = getCountryPhoneRule(countryCode);

  if (!rule) {
    throw new Error(`Unsupported country code "${countryCode}".`);
  }

  let digits = trimmed;

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = `${rule.dialCode}${digits.slice(1)}`;
  } else if (digits.startsWith(rule.dialCode)) {
    digits = digits;
  } else {
    digits = `${rule.dialCode}${digits}`;
  }

  if (!digits.startsWith(rule.dialCode)) {
    throw new Error(`Enter a valid mobile number for ${countryCode}.`);
  }

  const nationalNumber = digits.slice(rule.dialCode.length);

  if (
    nationalNumber.length !== rule.nationalNumberLength ||
    !rule.nationalNumberPattern.test(nationalNumber)
  ) {
    throw new Error(`Enter a valid mobile number for ${countryCode}.`);
  }

  return `+${rule.dialCode}${nationalNumber}`;
}

export function toAuthEmailAlias(phoneNumberE164: string): string {
  const normalized = phoneNumberE164.replace("+", "");
  return `${normalized}@mobile.inverbrass.internal`;
}
