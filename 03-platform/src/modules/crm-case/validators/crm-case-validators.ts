import { z } from "zod";

export const createCrmCaseSchema = z.object({
  caseTypeCode: z.string().min(1),
  categoryCode: z.string().max(50).optional().nullable(),
  subcategoryCode: z.string().max(50).optional().nullable(),
  subject: z.string().min(1).max(300),
  description: z.string().min(1).max(8000),
  priorityCode: z.string().min(1).optional(),
  severityCode: z.string().min(1).optional(),
  channelCode: z.string().max(50).optional().nullable(),
  ownerUserId: z.string().uuid().optional().nullable(),
  queueCode: z.string().max(50).optional().nullable(),
  primaryPartyId: z.string().uuid(),
  primaryContactPartyId: z.string().uuid().optional().nullable(),
  linkedCommunicationId: z.string().uuid().optional().nullable(),
  createFollowUpTask: z.boolean().optional(),
});

export const updateCrmCaseSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  description: z.string().min(1).max(8000).optional(),
  categoryCode: z.string().max(50).optional().nullable(),
  subcategoryCode: z.string().max(50).optional().nullable(),
  priorityCode: z.string().min(1).optional(),
  severityCode: z.string().min(1).optional(),
  channelCode: z.string().max(50).optional().nullable(),
  queueCode: z.string().max(50).optional().nullable(),
  primaryContactPartyId: z.string().uuid().optional().nullable(),
  linkedCommunicationId: z.string().uuid().optional().nullable(),
});

export const assignCrmCaseSchema = z.object({
  ownerUserId: z.string().uuid(),
  queueCode: z.string().max(50).optional().nullable(),
});

export const escalateCrmCaseSchema = z.object({
  reason: z.string().min(1).max(2000),
  toOwnerUserId: z.string().uuid().optional().nullable(),
});

export const resolveCrmCaseSchema = z.object({
  resolutionSummary: z.string().min(1).max(4000),
  resolutionCode: z.string().min(1).max(50),
  rootCauseCode: z.string().max(50).optional().nullable(),
});

export const closeCrmCaseSchema = z.object({
  satisfactionRating: z.number().int().min(1).max(5).optional().nullable(),
  satisfactionComment: z.string().max(2000).optional().nullable(),
});

export const reopenCrmCaseSchema = z.object({
  reopenReason: z.string().min(1).max(2000),
});

export const setPendingCustomerSchema = z.object({
  pauseReasonCode: z.string().max(50).optional(),
});

export const crmCaseListFiltersSchema = z.object({
  view: z.string().optional(),
  statusCode: z.string().optional(),
  caseTypeCode: z.string().optional(),
  priorityCode: z.string().optional(),
  primaryPartyId: z.string().uuid().optional(),
  search: z.string().optional(),
});
