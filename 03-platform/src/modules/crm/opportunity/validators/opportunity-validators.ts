/**
 * Purpose:
 * Zod validators for Opportunity Management payloads.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import { z } from "zod";

export const createOpportunitySchema = z.object({
  crmRecordId: z.string().uuid(),
  name: z.string().min(1).max(200),
  pipelineCode: z.string().optional(),
  stageCode: z.string().optional(),
  accountId: z.string().uuid().nullable().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  primaryContactPartyId: z.string().uuid().nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  currencyCode: z.string().length(3).nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  sourceLeadId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const updateOpportunitySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  accountId: z.string().uuid().nullable().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  primaryContactPartyId: z.string().uuid().nullable().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  amount: z.string().nullable().optional(),
  currencyCode: z.string().length(3).nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
  version: z.number().int().positive(),
});

export const opportunityStageTransitionSchema = z.object({
  stageCode: z.string().min(1),
  version: z.number().int().positive(),
  lossReasonCode: z.string().nullable().optional(),
  competitorCode: z.string().nullable().optional(),
  closeNotes: z.string().max(2000).nullable().optional(),
  finalAmount: z.string().nullable().optional(),
});

export const opportunityLineItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.string().optional(),
  unitPrice: z.string().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const opportunityListFiltersSchema = z.object({
  search: z.string().optional(),
  statusCode: z.string().optional(),
  stageCode: z.string().optional(),
  pipelineCode: z.string().optional(),
  ownerPartyId: z.string().uuid().optional(),
  crmRecordId: z.string().uuid().optional(),
  partyId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const opportunitySearchQuerySchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters to search.");
