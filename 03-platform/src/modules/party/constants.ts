/**
 * Purpose:
 * Party Foundation and Party Roles constants.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 * BP-002 / IP-002 – Party Roles
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

export const PARTY_ROLE_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
} as const;

export type PartyRoleStatusCode =
  (typeof PARTY_ROLE_STATUS_CODES)[keyof typeof PARTY_ROLE_STATUS_CODES];

export const CONTACT_TYPE_CODES = {
  MOBILE: "MOBILE",
  OFFICE_PHONE: "OFFICE_PHONE",
  HOME_PHONE: "HOME_PHONE",
  EMAIL: "EMAIL",
  WHATSAPP: "WHATSAPP",
  FAX: "FAX",
  WEBSITE: "WEBSITE",
  SOCIAL_MEDIA: "SOCIAL_MEDIA",
  EMERGENCY: "EMERGENCY",
} as const;

export type ContactTypeCode =
  (typeof CONTACT_TYPE_CODES)[keyof typeof CONTACT_TYPE_CODES];

export const PARTY_CONTACT_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type PartyContactStatusCode =
  (typeof PARTY_CONTACT_STATUS_CODES)[keyof typeof PARTY_CONTACT_STATUS_CODES];

export const GENDER_OPTIONS = [
  { code: "FEMALE", name: "Female" },
  { code: "MALE", name: "Male" },
  { code: "OTHER", name: "Other" },
  { code: "PREFER_NOT_TO_SAY", name: "Prefer not to say" },
] as const;

export const PARTY_WORKSPACE_TABS = [
  { id: "overview", label: "Overview", available: true },
  { id: "roles", label: "Roles", available: true },
  { id: "contacts", label: "Contacts", available: true },
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
