import { z } from "zod";

export const createCrmCommunicationSchema = z.object({
  channelTypeCode: z.string().min(1),
  directionCode: z.enum(["INBOUND", "OUTBOUND"]),
  subject: z.string().max(300).optional().nullable(),
  summary: z.string().min(1).max(4000),
  communicatedAt: z.string().datetime().optional(),
  durationSeconds: z.number().int().nonnegative().optional().nullable(),
  templateCode: z.string().max(100).optional().nullable(),
  threadId: z.string().uuid().optional().nullable(),
  primaryPartyId: z.string().uuid(),
  contactChannelValue: z.string().max(300).optional().nullable(),
  ownerUserId: z.string().uuid(),
  isSensitive: z.boolean().optional(),
  linkedVisitId: z.string().uuid().optional().nullable(),
  createFollowUpTask: z.boolean().optional(),
  allowConsentOverride: z.boolean().optional(),
});

export const createCrmCommunicationAddendumSchema = z.object({
  summary: z.string().min(1).max(4000),
  subject: z.string().max(300).optional().nullable(),
});

export const crmCommunicationListFiltersSchema = z.object({
  view: z.string().optional(),
  channelTypeCode: z.string().optional(),
  directionCode: z.string().optional(),
  primaryPartyId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  search: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
