/**
 * Purpose:
 * Country reference catalogue for auth, registration, and setup selectors.
 *
 * Why it exists:
 * IP-006A requires countries to be seeded so login/register/forgot-password/
 * setup country lookups are populated on a clean database.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

export const countries = [
  {
    code: "KE",
    iso3Code: "KEN",
    name: "Kenya",
    phoneCode: "+254",
    currencyCode: "KES",
    timezoneCode: "Africa/Nairobi",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "UG",
    iso3Code: "UGA",
    name: "Uganda",
    phoneCode: "+256",
    currencyCode: "UGX",
    timezoneCode: "Africa/Kampala",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "TZ",
    iso3Code: "TZA",
    name: "Tanzania",
    phoneCode: "+255",
    currencyCode: "TZS",
    timezoneCode: "Africa/Dar_es_Salaam",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "RW",
    iso3Code: "RWA",
    name: "Rwanda",
    phoneCode: "+250",
    currencyCode: "USD",
    timezoneCode: "Africa/Kigali",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "GB",
    iso3Code: "GBR",
    name: "United Kingdom",
    phoneCode: "+44",
    currencyCode: "GBP",
    timezoneCode: "Europe/London",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "US",
    iso3Code: "USA",
    name: "United States",
    phoneCode: "+1",
    currencyCode: "USD",
    timezoneCode: "America/New_York",
    displayOrder: 11,
    isActive: true,
  },
] as const;
