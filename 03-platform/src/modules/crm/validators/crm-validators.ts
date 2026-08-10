/**
 * Purpose:
 * Zod validators for CRM Foundation operations.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { z } from "zod";

export const createCrmRecordSchema = z.object({
  partyId: z.string().uuid("Select a valid party."),
  crmTypeCode: z.string().trim().min(1, "Customer type is required."),
  statusCode: z.string().trim().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  relationshipManagerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  sourceCode: z.string().trim().nullable().optional(),
  recordSource: z.string().trim().optional(),
});

export const updateCrmRecordSchema = z.object({
  crmTypeCode: z.string().trim().min(1).optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  relationshipManagerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  sourceCode: z.string().trim().nullable().optional(),
  version: z.number().int().positive(),
});

export const crmStatusTransitionSchema = z.object({
  statusCode: z.string().trim().min(1, "Status is required."),
  version: z.number().int().positive(),
});

export const crmListFiltersSchema = z.object({
  search: z.string().trim().optional(),
  statusCode: z.string().trim().optional(),
  crmTypeCode: z.string().trim().optional(),
  ownerPartyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const crmSearchQuerySchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters to search.");

export type CreateCrmRecordInput = z.infer<typeof createCrmRecordSchema>;
export type UpdateCrmRecordInput = z.infer<typeof updateCrmRecordSchema>;
export type CrmStatusTransitionInput = z.infer<typeof crmStatusTransitionSchema>;
export type CrmListFiltersInput = z.infer<typeof crmListFiltersSchema>;
