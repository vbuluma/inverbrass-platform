/**
 * Purpose:
 * Types for Party Communication & Consent Preferences.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import type {
  ConsentSource,
  PreferredContactMethod,
  PreferredContactTime,
} from "@/core/communication-preference/constants";

export type CommunicationPreferenceView = {
  id: string;
  partyId: string;
  preferredLanguageCode: string | null;
  preferredLanguageName: string | null;
  preferredTimezoneCode: string | null;
  preferredTimezoneName: string | null;
  preferredContactMethod: PreferredContactMethod | null;
  preferredContactTime: PreferredContactTime | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  marketingConsent: boolean;
  transactionalConsent: boolean;
  promotionalConsent: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsAppEnabled: boolean;
  phoneEnabled: boolean;
  pushNotificationEnabled: boolean;
  postalMailEnabled: boolean;
  consentDate: string | null;
  consentSource: ConsentSource | null;
  consentVersion: string | null;
  notes: string | null;
  statusCode: string;
  version: number;
  updatedAt: string;
};

export type SaveCommunicationPreferencePayload = {
  preferredLanguageCode?: string | null;
  preferredTimezoneCode?: string | null;
  preferredContactMethod?: PreferredContactMethod | null;
  preferredContactTime?: PreferredContactTime | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  marketingConsent?: boolean;
  transactionalConsent?: boolean;
  promotionalConsent?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsAppEnabled?: boolean;
  phoneEnabled?: boolean;
  pushNotificationEnabled?: boolean;
  postalMailEnabled?: boolean;
  consentSource?: ConsentSource | null;
  notes?: string | null;
  version?: number;
};

export type CommunicationPreferenceCatalogues = {
  languages: Array<{ code: string; name: string }>;
  timezones: Array<{ code: string; name: string }>;
  contactMethods: Array<{ code: string; label: string }>;
  contactTimes: Array<{ code: string; label: string }>;
  consentSources: Array<{ code: string; label: string }>;
};

export type CommunicationPreferencePanelView = {
  preference: CommunicationPreferenceView;
  catalogues: CommunicationPreferenceCatalogues;
};
