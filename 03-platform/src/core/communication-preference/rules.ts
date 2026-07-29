/**
 * Purpose:
 * Business rules for Communication & Consent Preferences.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import {
  CHANNEL_FIELD_BY_METHOD,
  PREFERRED_CONTACT_METHODS,
  type PreferredContactMethod,
} from "@/core/communication-preference/constants";
import type { CommunicationPreferenceChannelFields } from "@/core/communication-preference/constants";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidQuietHoursTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

export function validateQuietHours(
  start: string | null | undefined,
  end: string | null | undefined
): string | null {
  const hasStart = Boolean(start?.trim());
  const hasEnd = Boolean(end?.trim());

  if (hasStart !== hasEnd) {
    return "Provide both quiet hours start and end, or leave both empty.";
  }

  if (!hasStart || !hasEnd) {
    return null;
  }

  if (!isValidQuietHoursTime(start!) || !isValidQuietHoursTime(end!)) {
    return "Quiet hours must use HH:MM format (24-hour).";
  }

  if (start === end) {
    return "Quiet hours start and end cannot be the same.";
  }

  return null;
}

export function isPreferredMethodEnabled(
  method: PreferredContactMethod | null | undefined,
  channels: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsAppEnabled: boolean;
    phoneEnabled: boolean;
    pushNotificationEnabled: boolean;
    postalMailEnabled: boolean;
  }
): boolean {
  if (!method) {
    return true;
  }

  const field = CHANNEL_FIELD_BY_METHOD[method];
  return channels[field];
}

export function validatePreferredContactMethod(
  method: PreferredContactMethod | null | undefined,
  channels: CommunicationPreferenceChannelFields
): string | null {
  if (!method) {
    return null;
  }

  if (
    !Object.values(PREFERRED_CONTACT_METHODS).includes(
      method as PreferredContactMethod
    )
  ) {
    return "Select a valid preferred contact method.";
  }

  if (!isPreferredMethodEnabled(method, channels)) {
    return "Preferred contact method must be an enabled channel.";
  }

  return null;
}

export function consentFieldsChanged(
  before: {
    marketingConsent: boolean;
    transactionalConsent: boolean;
    promotionalConsent: boolean;
  },
  after: {
    marketingConsent: boolean;
    transactionalConsent: boolean;
    promotionalConsent: boolean;
  }
): boolean {
  return (
    before.marketingConsent !== after.marketingConsent ||
    before.transactionalConsent !== after.transactionalConsent ||
    before.promotionalConsent !== after.promotionalConsent
  );
}
