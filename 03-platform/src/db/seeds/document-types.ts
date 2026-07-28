/**
 * Purpose:
 * Seed data for Party Document Type reference catalogue.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
 */

export const documentTypes = [
  {
    code: "NATIONAL_ID",
    name: "National ID",
    description: "Government-issued national identity document.",
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "PASSPORT",
    name: "Passport",
    description: "International travel passport.",
    displayOrder: 2,
    isActive: true,
  },
  {
    code: "DRIVING_LICENCE",
    name: "Driving Licence",
    description: "Driver licence or permit.",
    displayOrder: 3,
    isActive: true,
  },
  {
    code: "BUSINESS_REGISTRATION",
    name: "Business Registration Certificate",
    description: "Company or business registration certificate.",
    displayOrder: 4,
    isActive: true,
  },
  {
    code: "TAX_CERTIFICATE",
    name: "Tax Certificate / PIN",
    description: "Tax registration or PIN certificate.",
    displayOrder: 5,
    isActive: true,
  },
  {
    code: "COMPANY_PIN",
    name: "Company PIN",
    description: "Company tax identification number document.",
    displayOrder: 6,
    isActive: true,
  },
  {
    code: "MEMORANDUM_ARTICLES",
    name: "Memorandum & Articles",
    description: "Memorandum and articles of association.",
    displayOrder: 7,
    isActive: true,
  },
  {
    code: "CR12_EXTRACT",
    name: "CR12 / Company Extract",
    description: "Company registry extract (e.g. CR12).",
    displayOrder: 8,
    isActive: true,
  },
  {
    code: "UTILITY_BILL",
    name: "Utility Bill",
    description: "Proof-of-address utility bill.",
    displayOrder: 9,
    isActive: true,
  },
  {
    code: "LEASE_AGREEMENT",
    name: "Lease Agreement",
    description: "Property or equipment lease agreement.",
    displayOrder: 10,
    isActive: true,
  },
  {
    code: "INSURANCE_CERTIFICATE",
    name: "Insurance Certificate",
    description: "Insurance policy or certificate.",
    displayOrder: 11,
    isActive: true,
  },
  {
    code: "PROFESSIONAL_LICENCE",
    name: "Professional Licence",
    description: "Professional or trade licence.",
    displayOrder: 12,
    isActive: true,
  },
  {
    code: "EMPLOYMENT_CONTRACT",
    name: "Employment Contract",
    description: "Employment or engagement contract.",
    displayOrder: 13,
    isActive: true,
  },
  {
    code: "PHOTOGRAPH",
    name: "Photograph",
    description: "Party photograph or portrait.",
    displayOrder: 14,
    isActive: true,
  },
  {
    code: "SIGNATURE",
    name: "Signature",
    description: "Captured signature image.",
    displayOrder: 15,
    isActive: true,
  },
  {
    code: "OTHER",
    name: "Other",
    description: "Other document type.",
    displayOrder: 99,
    isActive: true,
  },
] as const;
