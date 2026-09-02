/**
 * Purpose:
 * ENG-003o — Channel & Experience Engine constants.
 */

export const CHANNEL_EXPERIENCE_ENGINE_ID = "ENG-003o";

export const CHANNEL_CODES = {
  WEB: "WEB",
  APP: "APP",
  STAFF: "STAFF",
  CONVERSATIONAL: "CONVERSATIONAL",
  WHATSAPP: "WHATSAPP",
  MESSENGER: "MESSENGER",
  INSTAGRAM: "INSTAGRAM",
  API: "API",
} as const;

export type ChannelCode = (typeof CHANNEL_CODES)[keyof typeof CHANNEL_CODES];

export const CHANNEL_ACTOR_TYPES = {
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
  SUPPLIER: "SUPPLIER",
  SYSTEM: "SYSTEM",
  ANONYMOUS: "ANONYMOUS",
} as const;

export type ChannelActorType =
  (typeof CHANNEL_ACTOR_TYPES)[keyof typeof CHANNEL_ACTOR_TYPES];

export const CAPABILITY_ACCESS_MODES = {
  READ: "READ",
  WRITE: "WRITE",
} as const;

export type CapabilityAccessMode =
  (typeof CAPABILITY_ACCESS_MODES)[keyof typeof CAPABILITY_ACCESS_MODES];
