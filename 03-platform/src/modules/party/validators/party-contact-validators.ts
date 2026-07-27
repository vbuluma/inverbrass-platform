/**
 * Purpose:
 * Zod structural validators for Party Contact payloads.
 *
 * Implementation Package:
 * BP-002 / IP-003 – Contacts & Communication
 */

import { z } from "zod";

import { CONTACT_TYPE_CODES } from "@/modules/party/constants";

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""));

export const mobileValueSchema = z
  .string()
  .trim()
  .min(7, "Enter a mobile number.")
  .max(30)
  .regex(/^[+]?[\d\s()-]{7,30}$/, "Enter a valid mobile number.");

export const emailValueSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(255);

export const websiteValueSchema = z
  .string()
  .trim()
  .url("Enter a valid website URL.")
  .max(500);

export const addPartyContactSchema = z.object({
  contactTypeCode: z
    .string()
    .trim()
    .min(1, "Select a contact type.")
    .max(50),
  contactValue: z.string().trim().min(1, "Enter a contact value.").max(500),
  isPreferred: z.boolean().optional(),
  notes: optionalNotes,
});

export const updatePartyContactSchema = z.object({
  contactValue: z
    .string()
    .trim()
    .min(1, "Enter a contact value.")
    .max(500)
    .optional(),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

/**
 * WHAT: Apply type-specific value shape checks after contact type is known.
 * WHY: Structural only. Telephone values are normalized to E.164 (EDS-003)
 * in PartyContactService / party-phone before duplicate checks and persistence.
 */
export function validateContactValueForType(
  contactTypeCode: string,
  contactValue: string
): { ok: true } | { ok: false; message: string; field?: string } {
  if (
    contactTypeCode === CONTACT_TYPE_CODES.MOBILE ||
    contactTypeCode === CONTACT_TYPE_CODES.OFFICE_PHONE ||
    contactTypeCode === CONTACT_TYPE_CODES.HOME_PHONE ||
    contactTypeCode === CONTACT_TYPE_CODES.WHATSAPP ||
    contactTypeCode === CONTACT_TYPE_CODES.FAX ||
    contactTypeCode === CONTACT_TYPE_CODES.EMERGENCY
  ) {
    const parsed = mobileValueSchema.safeParse(contactValue);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Enter a valid number.",
        field: "contactValue",
      };
    }
    return { ok: true };
  }

  if (contactTypeCode === CONTACT_TYPE_CODES.EMAIL) {
    const parsed = emailValueSchema.safeParse(contactValue);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Enter a valid email.",
        field: "contactValue",
      };
    }
    return { ok: true };
  }

  if (contactTypeCode === CONTACT_TYPE_CODES.WEBSITE) {
    const parsed = websiteValueSchema.safeParse(contactValue);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Enter a valid website URL.",
        field: "contactValue",
      };
    }
    return { ok: true };
  }

  if (contactValue.trim().length < 1) {
    return {
      ok: false,
      message: "Enter a contact value.",
      field: "contactValue",
    };
  }

  return { ok: true };
}
