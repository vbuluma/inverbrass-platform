/**
 * Purpose:
 * Seed data for ENG-003b identifier type reference catalogue.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

export const identifierTypes = [
  {
    code: "NATIONAL_ID",
    name: "National ID",
    description: "Government-issued national identity number.",
    validationPattern: "^[0-9]{7,10}$",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "KRA_PIN",
    name: "KRA PIN",
    description: "Kenya Revenue Authority Personal Identification Number.",
    validationPattern: "^[A-Z][0-9]{9}[A-Z]$",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "PASSPORT",
    name: "Passport Number",
    description: "International travel passport number.",
    validationPattern: "^[A-Z0-9]{6,12}$",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "DRIVING_LICENCE",
    name: "Driving Licence",
    description: "Driver licence or permit number.",
    validationPattern: "^[A-Z0-9]{5,15}$",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "VAT_NUMBER",
    name: "VAT Number",
    description: "Value Added Tax registration number.",
    validationPattern: "^[A-Z0-9]{8,15}$",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "BUSINESS_REGISTRATION",
    name: "Business Registration Number",
    description: "Certificate of incorporation or business registration number.",
    validationPattern: "^[A-Z0-9/\\-]{5,20}$",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "BUSINESS_PERMIT",
    name: "Business Permit",
    description: "County or municipal business operating permit number.",
    validationPattern: "^[A-Z0-9/\\-]{5,20}$",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "INDUSTRY_LICENCE",
    name: "Industry Licence",
    description: "Sector-specific operating licence number.",
    validationPattern: "^[A-Z0-9/\\-]{5,20}$",
    displayOrder: 8,
    isActive: true,
  },
] as const;
