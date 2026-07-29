/**
 * Purpose:
 * Zod validators for Party Communication & Consent Preferences.
 *
 * Implementation Package:
 * BP-002 / IP-012 – Party Communication & Consent Preferences
 */

import { z } from "zod";

import {
  PREFERRED_CONTACT_METHODS,
  PREFERRED_CONTACT_TIMES,
} from "@/core/communication-preference/constants";

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value ?? null));

const quietHoursTime = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format (24-hour).")
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value ?? null));

export const savePartyCommunicationPreferenceSchema = z.object({
  preferredLanguageCode: optionalTrimmed(10),
  preferredTimezoneCode: optionalTrimmed(100),
  preferredContactMethod: z
    .enum(Object.values(PREFERRED_CONTACT_METHODS) as [string, ...string[]])
    .optional()
    .nullable(),
  preferredContactTime: z
    .enum(Object.values(PREFERRED_CONTACT_TIMES) as [string, ...string[]])
    .optional()
    .nullable(),
  quietHoursStart: quietHoursTime,
  quietHoursEnd: quietHoursTime,
  marketingConsent: z.boolean().optional(),
  transactionalConsent: z.boolean().optional(),
  promotionalConsent: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsAppEnabled: z.boolean().optional(),
  phoneEnabled: z.boolean().optional(),
  pushNotificationEnabled: z.boolean().optional(),
  postalMailEnabled: z.boolean().optional(),
  consentSource: z.string().trim().max(100).optional().nullable(),
  notes: optionalTrimmed(2000),
  version: z.number().int().positive().optional(),
});

export type SavePartyCommunicationPreferenceInput = z.infer<
  typeof savePartyCommunicationPreferenceSchema
>;
