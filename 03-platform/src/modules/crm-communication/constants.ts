/**
 * Domain constants for BP-004 / IP-08 Communication Management.
 */

export const CRM_COMMUNICATION_CHANNEL_CODES = {
  EMAIL: "EMAIL",
  PHONE: "PHONE",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
  LETTER: "LETTER",
  IN_PERSON: "IN_PERSON",
} as const;

export type CrmCommunicationChannelCode =
  (typeof CRM_COMMUNICATION_CHANNEL_CODES)[keyof typeof CRM_COMMUNICATION_CHANNEL_CODES];

export const CRM_COMMUNICATION_DIRECTION_CODES = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
} as const;

export type CrmCommunicationDirectionCode =
  (typeof CRM_COMMUNICATION_DIRECTION_CODES)[keyof typeof CRM_COMMUNICATION_DIRECTION_CODES];

export const CRM_COMMUNICATION_STATUS_CODES = {
  LOGGED: "LOGGED",
  SENT: "SENT",
  FAILED: "FAILED",
  BLOCKED_CONSENT: "BLOCKED_CONSENT",
} as const;

export const CRM_COMMUNICATION_CONSENT_RESULTS = {
  ALLOWED: "ALLOWED",
  BLOCKED: "BLOCKED",
  WARNED: "WARNED",
  NOT_REQUIRED: "NOT_REQUIRED",
} as const;

export const CRM_COMMUNICATION_RECORD_SOURCE_CODES = {
  MANUAL: "MANUAL",
  ENG_009: "ENG_009",
  SYSTEM: "SYSTEM",
} as const;

export const CRM_COMMUNICATION_ENTITY_TYPE_CODES = {
  PARTY: "PARTY",
  CRM_RECORD: "CRM_RECORD",
  ACCOUNT: "ACCOUNT",
  LEAD: "LEAD",
  OPPORTUNITY: "OPPORTUNITY",
  CASE: "CASE",
  CONTACT: "CONTACT",
  VISIT: "VISIT",
  ACTIVITY: "ACTIVITY",
} as const;

export const CRM_COMMUNICATION_LIST_VIEWS = {
  MY: "MY",
  RECENT: "RECENT",
  OUTBOUND: "OUTBOUND",
  INBOUND: "INBOUND",
  ALL: "ALL",
} as const;

export type CrmCommunicationListView =
  (typeof CRM_COMMUNICATION_LIST_VIEWS)[keyof typeof CRM_COMMUNICATION_LIST_VIEWS];

export const CRM_COMMUNICATION_NUMBER_PREFIX = "COM";

export const CRM_COMMUNICATION_CHANNEL_LABELS: Record<
  CrmCommunicationChannelCode,
  string
> = {
  EMAIL: "Email",
  PHONE: "Phone",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  LETTER: "Letter",
  IN_PERSON: "In-person",
};

export const CRM_COMMUNICATION_DIRECTION_LABELS: Record<
  CrmCommunicationDirectionCode,
  string
> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
};

export const CRM_COMMUNICATION_BUSINESS_RULES = {
  BRU_OUTBOUND_CONTACT: "Outbound communication requires a valid contact channel value.",
  BRU_CONSENT_BLOCK: "Consent denial blocks outbound on that channel unless exempted.",
  BRU_APPEND_ONLY: "Communication logs are append-only; corrections use addendum entries.",
  BRU_PARTY_REQUIRED: "Every log must reference at least one Party identity.",
  BRU_SENSITIVE: "Sensitive content flags restrict visibility by role.",
} as const;

/** ENG-009 transport stub — log now, send when engine integrated. */
export const CRM_COMMUNICATION_TRANSPORT_ARCHITECTURE = {
  pattern:
    "logCommunication → consentCheck(BP-002) → ENG-009.send(optional) → timeline + optional IP-05 follow-up",
  providers: ["EMAIL", "SMS", "WHATSAPP", "PHONE_CLICK_TO_CALL"] as const,
} as const;

/**
 * Communication preference ownership — BP-002 is master; IP-08 consumes only.
 */
export const CRM_COMMUNICATION_PREFERENCE_ARCHITECTURE = {
  owner: "BP-002 party_communication_preference",
  v1Consumed: "channel enable flags for outbound consent",
  deferredConsumption:
    "preferredLanguage, preferredContactTime, marketingConsent, transactionalConsent",
  doNotDuplicate: "IP-08 must not own preference master",
  futureChannels:
    "CONTACT_CENTRE, SOCIAL, WEB, API, INTERNAL_NOTE — log-ready when catalogue extended; transport ENG-009/003d",
} as const;
