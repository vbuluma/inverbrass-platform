/**
 * Purpose:
 * Types for ENG-003j Identity & Regulatory Identification Engine.
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

import type {
  IdentifierRequirementDisplayStatus,
  IdentifierStatusCode,
  IdentifierVerificationStatus,
  OcrComparisonOutcome,
} from "@/core/identity-regulatory/constants";
import type { RequiredIdentifierConfig } from "@/core/localization-regulatory/types";

export type CapturedIdentifierRecord = {
  id: string;
  identifierTypeCode: string;
  identifierValue: string;
  issuingCountryCode: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  statusCode: IdentifierStatusCode;
  verificationStatus: IdentifierVerificationStatus;
  verificationMethod: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  primaryIdentifier: boolean;
  linkedDocumentId: string | null;
  notes: string | null;
  version: number;
};

export type IdentifierRequirementRow = {
  identifierTypeCode: string;
  identifierTypeName: string;
  isRequired: boolean;
  displayStatus: IdentifierRequirementDisplayStatus;
  capturedIdentifierId: string | null;
  maskedValue: string | null;
  expiryDate: string | null;
  verificationStatus: IdentifierVerificationStatus | null;
};

export type IdentifierProfileSummary = {
  countryCode: string;
  countryName: string;
  ruleSetCode: string;
  ruleSetName: string;
  verificationPercent: number;
  requiredCount: number;
  capturedCount: number;
  verifiedCount: number;
  missingCount: number;
  expiredCount: number;
};

export type IdentifierVerificationRow = {
  identifierId: string;
  identifierTypeName: string;
  maskedValue: string;
  verificationStatus: IdentifierVerificationStatus;
  verificationMethod: string;
  verifiedByDisplay: string | null;
  verifiedAt: string | null;
  linkedDocumentName: string | null;
};

export type RegulatoryIdentifierProfile = {
  summary: IdentifierProfileSummary;
  requiredIdentifiers: IdentifierRequirementRow[];
  capturedIdentifiers: CapturedIdentifierView[];
  verifications: IdentifierVerificationRow[];
};

export type CapturedIdentifierView = {
  id: string;
  identifierTypeCode: string;
  identifierTypeName: string;
  maskedValue: string;
  fullValueAvailable: boolean;
  verificationStatus: IdentifierVerificationStatus;
  verificationMethod: string | null;
  linkedDocumentId: string | null;
  linkedDocumentName: string | null;
  expiryDate: string | null;
  statusCode: IdentifierStatusCode;
  primaryIdentifier: boolean;
  version: number;
};

export type CaptureIdentifierPayload = {
  identifierTypeCode: string;
  identifierValue: string;
  issuingCountryCode?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  primaryIdentifier?: boolean;
  linkedDocumentId?: string | null;
  notes?: string | null;
};

export type UpdateIdentifierPayload = {
  identifierValue?: string;
  issuingCountryCode?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  primaryIdentifier?: boolean;
  linkedDocumentId?: string | null;
  notes?: string | null;
  version: number;
};

export type VerifyIdentifierPayload = {
  verificationMethod?: string;
  notes?: string | null;
  version: number;
};

export type BuildRequirementRowsInput = {
  requirements: RequiredIdentifierConfig[];
  captured: CapturedIdentifierRecord[];
  typeNameByCode: Map<string, string>;
  referenceDate?: Date;
};

/** Future OCR comparison result — interface only. */
export type OcrComparisonResult = {
  identifierId: string;
  documentId: string;
  extractedValue: string;
  enteredValue: string;
  outcome: OcrComparisonOutcome;
  comparedAt: string;
};

/** Future verification provider request — interface only. */
export type IdentifierVerificationRequest = {
  identifierTypeCode: string;
  identifierValue: string;
  issuingCountryCode: string | null;
  partyTypeCode: string;
};

/** Future verification provider response — interface only. */
export type IdentifierVerificationResponse = {
  verified: boolean;
  providerCode: string;
  providerReference: string | null;
  message: string | null;
  verifiedAt: string;
};
