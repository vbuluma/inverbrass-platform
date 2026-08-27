/**
 * Purpose:
 * Zod structural validators for Offering Document payloads.
 *
 * Implementation Package:
 * BP-003 / IP-009 – Offering Documents & Compliance
 */

import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD).")
  .optional()
  .or(z.literal(""));

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""));

export const uploadOfferingDocumentMetadataSchema = z.object({
  documentTypeCode: z
    .string()
    .trim()
    .min(1, "Select a document type.")
    .max(50),
  issueDate: optionalDate,
  expiryDate: optionalDate,
  notes: optionalNotes,
});

export const verifyOfferingDocumentSchema = z.object({
  verificationMethodCode: z
    .string()
    .trim()
    .max(50)
    .optional()
    .or(z.literal("")),
  notes: optionalNotes,
});

export function nullableTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
