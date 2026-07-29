/**
 * Purpose:
 * Public exports for ENG-003j Identity & Regulatory Identification Engine.
 */

export {
  IDENTIFIER_STATUS_CODES,
  IDENTIFIER_VERIFICATION_STATUSES,
  IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES,
  IDENTIFIER_VERIFICATION_METHODS,
  DEFAULT_IDENTIFIER_VERIFICATION_METHOD,
  IDENTIFIER_VIEW_FULL_PERMISSION,
  OCR_COMPARISON_OUTCOMES,
} from "@/core/identity-regulatory/constants";
export type {
  IdentifierStatusCode,
  IdentifierVerificationStatus,
  IdentifierRequirementDisplayStatus,
  IdentifierVerificationMethod,
  OcrComparisonOutcome,
} from "@/core/identity-regulatory/constants";
export {
  maskIdentifierValue,
  formatIdentifierForDisplay,
} from "@/core/identity-regulatory/helpers/masking";
export {
  buildIdentifierRequirementRows,
  buildIdentifierProfileSummary,
  validateIdentifierPattern,
} from "@/core/identity-regulatory/services/identifier-profile-assembler";
export {
  IdentityRegulatoryService,
  IdentityRegulatoryError,
  createIdentityRegulatoryService,
} from "@/core/identity-regulatory/services/identity-regulatory-service";
export type {
  CapturedIdentifierRecord,
  CapturedIdentifierView,
  CaptureIdentifierPayload,
  UpdateIdentifierPayload,
  VerifyIdentifierPayload,
  IdentifierProfileSummary,
  IdentifierRequirementRow,
  IdentifierVerificationRow,
  RegulatoryIdentifierProfile,
  OcrComparisonResult,
  IdentifierVerificationRequest,
  IdentifierVerificationResponse,
} from "@/core/identity-regulatory/types";
export type {
  IdentifierVerificationProvider,
  IdentifierVerificationProviderCode,
} from "@/core/identity-regulatory/providers/verification-provider";
export {
  IdentifierVerificationProviderRegistry,
  createIdentifierVerificationProviderRegistry,
} from "@/core/identity-regulatory/providers/verification-provider";
export {
  createPartyIdentityIdentifierRepository,
  PartyIdentityIdentifierRepository,
} from "@/core/identity-regulatory/repositories/party-identity-identifier-repository";
export {
  NoOpOcrComparisonProvider,
  createNoOpOcrComparisonProvider,
} from "@/core/identity-regulatory/providers/ocr-comparison-provider";
