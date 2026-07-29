/**
 * Purpose:
 * Seed data for ENG-003b regulatory document requirement configuration.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 *
 * Note:
 * Document type codes reference the platform document_type catalogue.
 * Country-specific labels live in document_type.name — not hardcoded here.
 */

export const REGULATORY_REQUIREMENT_LEVELS = {
  REQUIRED: "REQUIRED",
  OPTIONAL: "OPTIONAL",
} as const;

export type RegulatoryRequirementLevel =
  (typeof REGULATORY_REQUIREMENT_LEVELS)[keyof typeof REGULATORY_REQUIREMENT_LEVELS];

export const regulatoryRuleSets = [
  {
    code: "KE_INDIVIDUAL",
    name: "Individual - Kenya",
    countryCode: "KE",
    partyTypeCode: "INDIVIDUAL",
    industryCode: null,
    displayOrder: 1,
    isActive: true,
  },
  {
    code: "KE_ORGANIZATION",
    name: "Organization - Kenya",
    countryCode: "KE",
    partyTypeCode: "ORGANIZATION",
    industryCode: null,
    displayOrder: 2,
    isActive: true,
  },
] as const;

export const regulatoryDocumentRequirements = [
  {
    ruleSetCode: "KE_INDIVIDUAL",
    documentTypeCode: "NATIONAL_ID",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 1,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    documentTypeCode: "PASSPORT",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 2,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    documentTypeCode: "DRIVING_LICENCE",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 3,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    documentTypeCode: "PHOTOGRAPH",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 4,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    documentTypeCode: "UTILITY_BILL",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 5,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    documentTypeCode: "TAX_CERTIFICATE",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 6,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    documentTypeCode: "BUSINESS_REGISTRATION",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 1,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    documentTypeCode: "TAX_CERTIFICATE",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 2,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    documentTypeCode: "COMPANY_PIN",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 3,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    documentTypeCode: "CR12_EXTRACT",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 4,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    documentTypeCode: "MEMORANDUM_ARTICLES",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 5,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    documentTypeCode: "INSURANCE_CERTIFICATE",
    requirementLevel: REGULATORY_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 6,
    isActive: true,
  },
] as const;
