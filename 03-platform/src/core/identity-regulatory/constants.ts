/**
 * Purpose:
 * Constants for ENG-003j Identity & Regulatory Identification Engine.
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 */

/** Lifecycle status for a captured identifier row. */
export const IDENTIFIER_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  EXPIRED: "EXPIRED",
} as const;

export type IdentifierStatusCode =
  (typeof IDENTIFIER_STATUS_CODES)[keyof typeof IDENTIFIER_STATUS_CODES];

/** Verification status — whether the identifier value has been confirmed. */
export const IDENTIFIER_VERIFICATION_STATUSES = {
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
} as const;

export type IdentifierVerificationStatus =
  (typeof IDENTIFIER_VERIFICATION_STATUSES)[keyof typeof IDENTIFIER_VERIFICATION_STATUSES];

/** Combined display status for requirement rows. */
export const IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES = {
  MISSING: "MISSING",
  CAPTURED: "CAPTURED",
  VERIFIED: "VERIFIED",
  EXPIRED: "EXPIRED",
} as const;

export type IdentifierRequirementDisplayStatus =
  (typeof IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES)[keyof typeof IDENTIFIER_REQUIREMENT_DISPLAY_STATUSES];

/** Verification methods — extensible for future API integrations. */
export const IDENTIFIER_VERIFICATION_METHODS = {
  MANUAL: "MANUAL",
  GOVERNMENT_API: "GOVERNMENT_API",
  PARTNER_API: "PARTNER_API",
  OCR: "OCR",
  AI_ASSISTED: "AI_ASSISTED",
} as const;

export type IdentifierVerificationMethod =
  (typeof IDENTIFIER_VERIFICATION_METHODS)[keyof typeof IDENTIFIER_VERIFICATION_METHODS];

export const DEFAULT_IDENTIFIER_VERIFICATION_METHOD =
  IDENTIFIER_VERIFICATION_METHODS.MANUAL;

/** Permission code for viewing unmasked identifier values. */
export const IDENTIFIER_VIEW_FULL_PERMISSION =
  "PartyManagement.PartyIdentityIdentifier.Read" as const;

/** OCR comparison outcomes — prepared for future OCR integration. */
export const OCR_COMPARISON_OUTCOMES = {
  MATCH: "MATCH",
  MISMATCH: "MISMATCH",
  INCONCLUSIVE: "INCONCLUSIVE",
} as const;

export type OcrComparisonOutcome =
  (typeof OCR_COMPARISON_OUTCOMES)[keyof typeof OCR_COMPARISON_OUTCOMES];
