/**
 * Purpose:
 * Zod validators for Account & Contact Management payloads.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  accountTypeCode: z.string().min(1),
  statusCode: z.string().optional(),
  partyId: z.string().uuid().nullable().optional(),
  crmRecordId: z.string().uuid().nullable().optional(),
  parentAccountId: z.string().uuid().nullable().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  segmentCode: z.string().max(50).nullable().optional(),
  classificationTags: z.array(z.string().max(50)).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  accountTypeCode: z.string().min(1).optional(),
  statusCode: z.string().optional(),
  partyId: z.string().uuid().nullable().optional(),
  crmRecordId: z.string().uuid().nullable().optional(),
  parentAccountId: z.string().uuid().nullable().optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  segmentCode: z.string().max(50).nullable().optional(),
  classificationTags: z.array(z.string().max(50)).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  version: z.number().int().positive(),
});

export const assignAccountContactSchema = z.object({
  contactPartyId: z.string().uuid(),
  roleCode: z.string().min(1),
  influenceLevel: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  opportunityId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const updateAccountContactSchema = z.object({
  roleCode: z.string().min(1).optional(),
  influenceLevel: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  opportunityId: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  version: z.number().int().positive(),
});

export const accountListFiltersSchema = z.object({
  search: z.string().optional(),
  statusCode: z.string().optional(),
  accountTypeCode: z.string().optional(),
  ownerPartyId: z.string().uuid().optional(),
  crmRecordId: z.string().uuid().optional(),
  partyId: z.string().uuid().optional(),
  parentAccountId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const accountSearchQuerySchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters to search.");
