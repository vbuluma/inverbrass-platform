/**
 * Zod validators for BP-004 / IP-05 Activity & Task Management.
 * Codes validated against metadata catalogues at service layer.
 */

import { z } from "zod";

const entityLinkSchema = z.object({
  entityTypeCode: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
});

export const createCrmActivitySchema = z.object({
  activityTypeCode: z.string().trim().min(1).max(50),
  subject: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).nullable().optional(),
  priorityCode: z.string().trim().min(1).max(50).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  scheduledStart: z.string().datetime().nullable().optional(),
  scheduledEnd: z.string().datetime().nullable().optional(),
  ownerUserId: z.string().uuid(),
  primaryPartyId: z.string().uuid(),
  entityLinks: z.array(entityLinkSchema).optional(),
  recordSourceCode: z.string().max(50).optional(),
  sourceReferenceType: z.string().max(50).nullable().optional(),
  sourceReferenceId: z.string().uuid().nullable().optional(),
});

export const updateCrmActivitySchema = z
  .object({
    subject: z.string().trim().min(1).max(300).optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    priorityCode: z.string().trim().min(1).max(50).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    scheduledStart: z.string().datetime().nullable().optional(),
    scheduledEnd: z.string().datetime().nullable().optional(),
    ownerUserId: z.string().uuid().optional(),
    addendumNotes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update.",
  });

export const completeCrmActivitySchema = z.object({
  outcomeCode: z.string().trim().min(1).max(50),
  outcomeNotes: z.string().trim().max(2000).nullable().optional(),
});

export const cancelCrmActivitySchema = z.object({
  cancelReason: z.string().trim().min(1).max(500),
});

export const deferCrmActivitySchema = z.object({
  deferReason: z.string().trim().min(1).max(500),
  deferredUntil: z.string().datetime(),
});

export const reassignCrmActivitySchema = z.object({
  ownerUserId: z.string().uuid(),
  reason: z.string().trim().max(500).nullable().optional(),
});

export const crmActivityListFiltersSchema = z.object({
  view: z.string().max(50).optional(),
  activityTypeCode: z.string().max(50).optional(),
  statusCode: z.string().max(50).optional(),
  ownerUserId: z.string().uuid().optional(),
  primaryPartyId: z.string().uuid().optional(),
  entityTypeCode: z.string().max(50).optional(),
  entityId: z.string().uuid().optional(),
  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),
  search: z.string().trim().max(200).optional(),
});

export const crmActivitySearchQuerySchema = z.object({
  query: z.string().trim().min(1).max(200),
});
