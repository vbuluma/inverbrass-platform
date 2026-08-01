/**
 * Purpose:
 * Zod structural validators for Offering Relationship payloads.
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import { z } from "zod";

const optionalNotes = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""));

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const addOfferingRelationshipSchema = z.object({
  targetOfferingId: z.string().trim().uuid("Select a related product."),
  relationshipTypeCode: z
    .string()
    .trim()
    .min(1, "Select a relationship type.")
    .max(80),
  effectiveFrom: isoDateSchema.optional(),
  effectiveTo: isoDateSchema.optional().nullable().or(z.literal("")),
  notes: optionalNotes,
});

export const updateOfferingRelationshipSchema = z.object({
  effectiveFrom: isoDateSchema.optional(),
  effectiveTo: isoDateSchema.optional().nullable().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const offeringSearchQuerySchema = z.object({
  query: z.string().trim().min(2, "Enter at least 2 characters to search."),
  excludeProductId: z.string().uuid().optional(),
});
