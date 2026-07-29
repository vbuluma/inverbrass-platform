/**
 * Purpose:
 * Seed data for ENG-003b required identifier configuration.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

export const REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS = {
  REQUIRED: "REQUIRED",
  OPTIONAL: "OPTIONAL",
} as const;

export type RegulatoryIdentifierRequirementLevel =
  (typeof REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS)[keyof typeof REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS];

export const requiredIdentifiers = [
  {
    ruleSetCode: "KE_INDIVIDUAL",
    identifierTypeCode: "NATIONAL_ID",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 1,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    identifierTypeCode: "KRA_PIN",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 2,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    identifierTypeCode: "PASSPORT",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 3,
    isActive: true,
  },
  {
    ruleSetCode: "KE_INDIVIDUAL",
    identifierTypeCode: "DRIVING_LICENCE",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 4,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    identifierTypeCode: "BUSINESS_REGISTRATION",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 1,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    identifierTypeCode: "KRA_PIN",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 2,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    identifierTypeCode: "BUSINESS_PERMIT",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 3,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    identifierTypeCode: "VAT_NUMBER",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.REQUIRED,
    displayOrder: 4,
    isActive: true,
  },
  {
    ruleSetCode: "KE_ORGANIZATION",
    identifierTypeCode: "INDUSTRY_LICENCE",
    requirementLevel: REGULATORY_IDENTIFIER_REQUIREMENT_LEVELS.OPTIONAL,
    displayOrder: 5,
    isActive: true,
  },
] as const;
