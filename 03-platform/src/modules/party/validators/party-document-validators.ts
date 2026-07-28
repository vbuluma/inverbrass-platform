/**
 * Purpose:
 * Zod structural validators for Party Document payloads.
 *
 * Implementation Package:
 * BP-002 / IP-007 – Party Documents
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

export const uploadPartyDocumentMetadataSchema = z.object({
  documentTypeCode: z
    .string()
    .trim()
    .min(1, "Select a document type.")
    .max(50),
  issueDate: optionalDate,
  expiryDate: optionalDate,
  notes: optionalNotes,
});

export const verifyPartyDocumentSchema = z.object({
  notes: optionalNotes,
});

export function nullableTrimmed(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
