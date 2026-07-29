/**
 * Purpose:
 * Reusable Communication & Consent capability exports.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

export {
  COMMUNICATION_PREFERENCE_STATUS_CODES,
  CONSENT_SOURCES,
  DEFAULT_CONSENT_VERSION,
  PREFERRED_CONTACT_METHODS,
  PREFERRED_CONTACT_METHOD_LABELS,
  PREFERRED_CONTACT_TIMES,
  PREFERRED_CONTACT_TIME_LABELS,
  CONSENT_SOURCE_LABELS,
  type CommunicationPreferenceStatusCode,
  type ConsentSource,
  type PreferredContactMethod,
  type PreferredContactTime,
} from "@/core/communication-preference/constants";

export {
  consentFieldsChanged,
  isPreferredMethodEnabled,
  validatePreferredContactMethod,
  validateQuietHours,
} from "@/core/communication-preference/rules";

export {
  createCommunicationPreferenceRepository,
  CommunicationPreferenceRepository,
} from "@/core/communication-preference/repositories/communication-preference-repository";

export {
  CommunicationPreferenceError,
  CommunicationPreferenceService,
  createCommunicationPreferenceService,
} from "@/core/communication-preference/services/communication-preference-service";

export type {
  CommunicationPreferenceCatalogues,
  CommunicationPreferencePanelView,
  CommunicationPreferenceView,
  SaveCommunicationPreferencePayload,
} from "@/core/communication-preference/types";
