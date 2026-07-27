/**
 * Purpose:
 * Party Foundation constants and catalogues for IP-001.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const PARTY_TYPE_CODES = {
  INDIVIDUAL: "INDIVIDUAL",
  ORGANIZATION: "ORGANIZATION",
} as const;

export type PartyTypeCode =
  (typeof PARTY_TYPE_CODES)[keyof typeof PARTY_TYPE_CODES];

export const PARTY_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  ARCHIVED: "ARCHIVED",
} as const;

export type PartyStatusCode =
  (typeof PARTY_STATUS_CODES)[keyof typeof PARTY_STATUS_CODES];

export const GENDER_OPTIONS = [
  { code: "FEMALE", name: "Female" },
  { code: "MALE", name: "Male" },
  { code: "OTHER", name: "Other" },
  { code: "PREFER_NOT_TO_SAY", name: "Prefer not to say" },
] as const;

export const PARTY_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "roles", label: "Roles", available: false },
  { id: "contacts", label: "Contacts", available: false },
  { id: "addresses", label: "Addresses", available: false },
  { id: "branches", label: "Branches", available: false },
  { id: "relationships", label: "Relationships", available: false },
  { id: "documents", label: "Documents", available: false },
  { id: "groups", label: "Groups", available: false },
  { id: "timeline", label: "Timeline", available: false },
  {
    id: "communication-preferences",
    label: "Communication Preferences",
    available: false,
  },
  { id: "audit-history", label: "Audit History", available: false },
] as const;

export const FUTURE_TAB_MESSAGE =
  "Available in a future Implementation Package." as const;
