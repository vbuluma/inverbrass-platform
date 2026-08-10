/**
 * Purpose:
 * Zod validators for Lead Management payloads.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { z } from "zod";

export const createLeadSchema = z.object({
  partyId: z.string().uuid("Select a valid party."),
  sourceCode: z.string().min(1, "Lead source is required."),
  channelCode: z.string().nullable().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  companyName: z.string().max(200).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateLeadSchema = z.object({
  sourceCode: z.string().min(1).optional(),
  channelCode: z.string().nullable().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  companyName: z.string().max(200).nullable().optional(),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().max(255).nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  qualificationScore: z.number().int().min(0).max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  version: z.number().int().positive(),
});

export const leadStatusTransitionSchema = z.object({
  statusCode: z.string().min(1),
  version: z.number().int().positive(),
  disqualificationReasonCode: z.string().nullable().optional(),
});

export const leadDisqualifySchema = z.object({
  reasonCode: z.string().min(1, "Disqualification reason is required."),
  version: z.number().int().positive(),
});

export const leadConvertSchema = z.object({
  version: z.number().int().positive(),
  crmTypeCode: z.string().optional(),
  createCrmIfMissing: z.boolean().optional(),
  createOpportunity: z.boolean().optional(),
  opportunityName: z.string().max(200).optional(),
});

export const leadListFiltersSchema = z.object({
  search: z.string().optional(),
  statusCode: z.string().optional(),
  sourceCode: z.string().optional(),
  ownerPartyId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const leadSearchQuerySchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters to search.");
