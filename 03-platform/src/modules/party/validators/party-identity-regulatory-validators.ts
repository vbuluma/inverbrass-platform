/**
 * Purpose:
 * Zod validators for Party Identity & Regulatory Information actions.
 *
 * Implementation Package:
 * BP-002 / IP-013 – Identity & Regulatory Information
 */

import { z } from "zod";

const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const nullableTrimmed = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  });

export const capturePartyIdentifierSchema = z.object({
  identifierTypeCode: z.string().trim().min(1, "Identifier type is required."),
  identifierValue: z.string().trim().min(1, "Identifier value is required.").max(500),
  issuingCountryCode: nullableTrimmed.optional(),
  issuingAuthority: nullableTrimmed.optional(),
  issueDate: optionalTrimmed,
  expiryDate: optionalTrimmed,
  primaryIdentifier: z.boolean().optional(),
  linkedDocumentId: nullableTrimmed.optional(),
  notes: nullableTrimmed.optional(),
});

export const updatePartyIdentifierSchema = z.object({
  identifierValue: z.string().trim().min(1).max(500).optional(),
  issuingCountryCode: nullableTrimmed.optional(),
  issuingAuthority: nullableTrimmed.optional(),
  issueDate: optionalTrimmed,
  expiryDate: optionalTrimmed,
  primaryIdentifier: z.boolean().optional(),
  linkedDocumentId: nullableTrimmed.optional(),
  notes: nullableTrimmed.optional(),
  version: z.number().int().positive(),
});

export const verifyPartyIdentifierSchema = z.object({
  verificationMethod: optionalTrimmed,
  notes: nullableTrimmed.optional(),
  version: z.number().int().positive(),
});

export const linkPartyIdentifierDocumentSchema = z.object({
  documentId: z.string().uuid("Select a valid document."),
  version: z.number().int().positive(),
});

export const removePartyIdentifierSchema = z.object({
  version: z.number().int().positive(),
});
