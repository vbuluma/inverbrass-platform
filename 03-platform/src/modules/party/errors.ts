/**
 * Purpose:
 * Typed errors for Party Foundation operations.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const PARTY_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  PARTY_TYPE_IMMUTABLE: "PARTY_TYPE_IMMUTABLE",
  INVALID_PARTY_TYPE: "INVALID_PARTY_TYPE",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  PARTY_ROLE_NOT_FOUND: "PARTY_ROLE_NOT_FOUND",
  DUPLICATE_ACTIVE_ROLE: "DUPLICATE_ACTIVE_ROLE",
  INVALID_ROLE_TRANSITION: "INVALID_ROLE_TRANSITION",
  PARTY_CONTACT_NOT_FOUND: "PARTY_CONTACT_NOT_FOUND",
  DUPLICATE_PREFERRED_CONTACT: "DUPLICATE_PREFERRED_CONTACT",
  DUPLICATE_CONTACT_VALUE: "DUPLICATE_CONTACT_VALUE",
  INVALID_CONTACT_TRANSITION: "INVALID_CONTACT_TRANSITION",
  PREFERRED_CONTACT_INACTIVE: "PREFERRED_CONTACT_INACTIVE",
  WEBSITE_NOT_ALLOWED: "WEBSITE_NOT_ALLOWED",
  MOBILE_REQUIRED: "MOBILE_REQUIRED",
  PARTY_ADDRESS_NOT_FOUND: "PARTY_ADDRESS_NOT_FOUND",
  DEFAULT_ADDRESS_INACTIVE: "DEFAULT_ADDRESS_INACTIVE",
  INVALID_ADDRESS_TRANSITION: "INVALID_ADDRESS_TRANSITION",
  ADDRESS_TYPE_NOT_ALLOWED: "ADDRESS_TYPE_NOT_ALLOWED",
  PARTY_RELATIONSHIP_NOT_FOUND: "PARTY_RELATIONSHIP_NOT_FOUND",
  DUPLICATE_ACTIVE_RELATIONSHIP: "DUPLICATE_ACTIVE_RELATIONSHIP",
  SELF_RELATIONSHIP_NOT_ALLOWED: "SELF_RELATIONSHIP_NOT_ALLOWED",
  INVALID_RELATIONSHIP_TRANSITION: "INVALID_RELATIONSHIP_TRANSITION",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type PartyErrorCode =
  (typeof PARTY_ERROR_CODES)[keyof typeof PARTY_ERROR_CODES];

export class PartyError extends Error {
  readonly code: PartyErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: PartyErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "PartyError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const PARTY_USER_MESSAGES = {
  INVALID_INPUT: "Please check your details and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing parties.",
  PARTY_NOT_FOUND: "That party could not be found.",
  PARTY_TYPE_IMMUTABLE: "Party type cannot be changed after creation.",
  INVALID_PARTY_TYPE: "Select Individual or Organization.",
  INVALID_STATUS_TRANSITION: "That status change is not allowed.",
  REFERENCE_DATA_MISSING:
    "Required Party reference data is missing. Seed Party catalogues before continuing.",
  PARTY_ROLE_NOT_FOUND: "That party role could not be found.",
  DUPLICATE_ACTIVE_ROLE: "That role is already active for this party.",
  INVALID_ROLE_TRANSITION: "That role status change is not allowed.",
  PARTY_CONTACT_NOT_FOUND: "That contact could not be found.",
  DUPLICATE_PREFERRED_CONTACT:
    "Only one preferred contact is allowed per contact type.",
  DUPLICATE_CONTACT_VALUE:
    "That phone number is already registered for this party.",
  INVALID_CONTACT_TRANSITION: "That contact status change is not allowed.",
  PREFERRED_CONTACT_INACTIVE: "A preferred contact must remain active.",
  WEBSITE_NOT_ALLOWED:
    "Website contacts are only available for Organization parties.",
  MOBILE_REQUIRED: "Enter a mobile number for this Individual.",
  PARTY_ADDRESS_NOT_FOUND: "That address could not be found.",
  DEFAULT_ADDRESS_INACTIVE: "A default address must remain active.",
  INVALID_ADDRESS_TRANSITION: "That address status change is not allowed.",
  ADDRESS_TYPE_NOT_ALLOWED:
    "That address type is not available for this party type.",
  PARTY_RELATIONSHIP_NOT_FOUND: "That relationship could not be found.",
  DUPLICATE_ACTIVE_RELATIONSHIP:
    "An active relationship of that type already exists between these parties.",
  SELF_RELATIONSHIP_NOT_ALLOWED: "A party cannot have a relationship with itself.",
  INVALID_RELATIONSHIP_TRANSITION: "That relationship status change is not allowed.",
  PROVIDER_ERROR: "We could not complete that Party action. Please try again.",
} as const;
