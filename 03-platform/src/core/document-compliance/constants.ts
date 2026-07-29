/**
 * Purpose:
 * Core Platform Document & Compliance constants.
 *
 * Module:
 * Core Platform – Document & Compliance (reusable across Build Packs)
 */

/** Evidence lifecycle in object storage metadata (active/inactive row). */
export const DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type DocumentEvidenceLifecycleStatus =
  (typeof DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES)[keyof typeof DOCUMENT_EVIDENCE_LIFECYCLE_STATUSES];

/** Validity — whether evidence satisfies temporal and presence rules. */
export const DOCUMENT_VALIDITY_STATUSES = {
  MISSING: "MISSING",
  PENDING: "PENDING",
  VALID: "VALID",
  EXPIRED: "EXPIRED",
  REVOKED: "REVOKED",
} as const;

export type DocumentValidityStatus =
  (typeof DOCUMENT_VALIDITY_STATUSES)[keyof typeof DOCUMENT_VALIDITY_STATUSES];

/** Verification — whether evidence has been confirmed by a trusted process. */
export const DOCUMENT_VERIFICATION_STATUSES = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
} as const;

export type DocumentVerificationStatus =
  (typeof DOCUMENT_VERIFICATION_STATUSES)[keyof typeof DOCUMENT_VERIFICATION_STATUSES];

/**
 * Combined compliance display status for requirement rows.
 * Preserves existing UI labels and business scoring behaviour.
 */
export const COMPLIANCE_DISPLAY_STATUSES = {
  MISSING: "MISSING",
  UPLOADED: "UPLOADED",
  VERIFIED: "VERIFIED",
  EXPIRED: "EXPIRED",
} as const;

export type ComplianceDisplayStatus =
  (typeof COMPLIANCE_DISPLAY_STATUSES)[keyof typeof COMPLIANCE_DISPLAY_STATUSES];

/** @deprecated Alias — use COMPLIANCE_DISPLAY_STATUSES */
export const COMPLIANCE_REQUIREMENT_STATUSES = COMPLIANCE_DISPLAY_STATUSES;

/** @deprecated Alias — use ComplianceDisplayStatus */
export type ComplianceRequirementStatus = ComplianceDisplayStatus;

/** Configurable verification methods — extensible via verification_method catalogue. */
export const VERIFICATION_METHOD_CODES = {
  MANUAL: "MANUAL",
  GOVERNMENT_API: "GOVERNMENT_API",
  THIRD_PARTY_API: "THIRD_PARTY_API",
  OCR_ASSISTED: "OCR_ASSISTED",
  AI_ASSISTED: "AI_ASSISTED",
} as const;

export type VerificationMethodCode =
  (typeof VERIFICATION_METHOD_CODES)[keyof typeof VERIFICATION_METHOD_CODES];

export const DEFAULT_VERIFICATION_METHOD_CODE =
  VERIFICATION_METHOD_CODES.MANUAL;
