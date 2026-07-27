/**
 * Purpose:
 * Zod structural validators for Party Relationship payloads.
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
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

export const addPartyRelationshipSchema = z.object({
  toPartyId: z.string().trim().uuid("Select a related party."),
  relationshipTypeCode: z
    .string()
    .trim()
    .min(1, "Select a relationship type.")
    .max(50),
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional().nullable().or(z.literal("")),
  notes: optionalNotes,
});

export const updatePartyRelationshipSchema = z.object({
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional().nullable().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const partySearchQuerySchema = z.object({
  query: z.string().trim().min(2, "Enter at least 2 characters to search."),
  maxResults: z.number().int().min(1).max(50).optional(),
});
