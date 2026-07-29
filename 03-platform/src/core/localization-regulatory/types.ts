/**
 * Purpose:
 * Types for ENG-003b required document resolution.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

export type RegulatorySubjectContext = {
  countryCode: string;
  partyTypeCode: string;
  industryCode: string | null;
};

/** @deprecated Use RegulatorySubjectContext */
export type PartyRegulatoryContext = RegulatorySubjectContext;

export type RequiredDocumentConfig = {
  documentTypeCode: string;
  requirementLevel: "REQUIRED" | "OPTIONAL";
  displayOrder: number;
};

/** @deprecated Use RequiredDocumentConfig */
export type RegulatoryDocumentRequirementConfig = RequiredDocumentConfig;

export type ResolvedRegulatoryRuleSet = {
  code: string;
  name: string;
  countryCode: string;
  partyTypeCode: string;
  industryCode: string | null;
  requirements: RequiredDocumentConfig[];
};
