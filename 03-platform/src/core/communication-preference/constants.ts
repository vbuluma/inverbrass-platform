/**
 * Purpose:
 * Constants for Party Communication & Consent Preferences.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

export const COMMUNICATION_PREFERENCE_STATUS_CODES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

export type CommunicationPreferenceStatusCode =
  (typeof COMMUNICATION_PREFERENCE_STATUS_CODES)[keyof typeof COMMUNICATION_PREFERENCE_STATUS_CODES];

export const PREFERRED_CONTACT_METHODS = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
  PHONE: "PHONE",
  PUSH: "PUSH",
  POSTAL: "POSTAL",
} as const;

export type PreferredContactMethod =
  (typeof PREFERRED_CONTACT_METHODS)[keyof typeof PREFERRED_CONTACT_METHODS];

export const PREFERRED_CONTACT_METHOD_LABELS: Record<
  PreferredContactMethod,
  string
> = {
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  PUSH: "Push Notification",
  POSTAL: "Postal Mail",
};

export const PREFERRED_CONTACT_TIMES = {
  MORNING: "MORNING",
  AFTERNOON: "AFTERNOON",
  EVENING: "EVENING",
  ANYTIME: "ANYTIME",
} as const;

export type PreferredContactTime =
  (typeof PREFERRED_CONTACT_TIMES)[keyof typeof PREFERRED_CONTACT_TIMES];

export const PREFERRED_CONTACT_TIME_LABELS: Record<
  PreferredContactTime,
  string
> = {
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
  ANYTIME: "Anytime",
};

export const CONSENT_SOURCES = {
  /** @deprecated Use ENG-003b consent_source catalogue — BRANCH for manual entry only */
  BRANCH: "BRANCH",
  ONLINE_REGISTRATION: "ONLINE_REGISTRATION",
  CUSTOMER_PORTAL: "CUSTOMER_PORTAL",
  MOBILE_APP: "MOBILE_APP",
  CALL_CENTRE: "CALL_CENTRE",
  PAPER_FORM: "PAPER_FORM",
  WHATSAPP: "WHATSAPP",
  SMS: "SMS",
  EMAIL_LINK: "EMAIL_LINK",
  API: "API",
  IMPORTED: "IMPORTED",
  SELF_SERVICE: "SELF_SERVICE",
} as const;

export type ConsentSource = string;

/** Fallback labels when ENG-003b catalogue is unavailable */
export const CONSENT_SOURCE_LABELS: Record<string, string> = {
  BRANCH: "Branch",
  ONLINE_REGISTRATION: "Online Registration",
  CUSTOMER_PORTAL: "Customer Portal",
  MOBILE_APP: "Mobile App",
  CALL_CENTRE: "Call Centre",
  PAPER_FORM: "Paper Form",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL_LINK: "Email Link",
  API: "API",
  IMPORTED: "Imported",
  SELF_SERVICE: "Self Service",
};

export const DEFAULT_CONSENT_VERSION = "1.0";

export const CHANNEL_FIELD_BY_METHOD: Record<
  PreferredContactMethod,
  keyof CommunicationPreferenceChannelFields
> = {
  EMAIL: "emailEnabled",
  SMS: "smsEnabled",
  WHATSAPP: "whatsAppEnabled",
  PHONE: "phoneEnabled",
  PUSH: "pushNotificationEnabled",
  POSTAL: "postalMailEnabled",
};

export type CommunicationPreferenceChannelFields = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsAppEnabled: boolean;
  phoneEnabled: boolean;
  pushNotificationEnabled: boolean;
  postalMailEnabled: boolean;
};
