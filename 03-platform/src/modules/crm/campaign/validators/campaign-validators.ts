/**
 * Purpose:
 * Zod validators for campaign create/update/search payloads.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import { z } from "zod";

import {
  CAMPAIGN_MEMBER_STATUS_CODES,
  CAMPAIGN_STATUS_CODES,
  CAMPAIGN_TYPE_CODES,
} from "@/modules/crm/constants";

const uuidField = z.string().uuid("Must be a valid UUID.");
const optionalUuidField = uuidField.optional().nullable();
const optionalText = z.string().trim().max(4000).optional().nullable();
const optionalDateField = z
  .string()
  .datetime({ offset: true })
  .or(z.string().date())
  .optional()
  .nullable();

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, "Campaign name is required.").max(200),
  campaignType: z.enum([
    CAMPAIGN_TYPE_CODES.EMAIL,
    CAMPAIGN_TYPE_CODES.EVENT,
    CAMPAIGN_TYPE_CODES.REFERRAL,
    CAMPAIGN_TYPE_CODES.ADVERTISING,
    CAMPAIGN_TYPE_CODES.PARTNER,
  ]),
  currencyCode: z.string().trim().length(3, "Currency must be a 3-letter code."),
  startAt: optionalDateField,
  endAt: optionalDateField,
  budgetAmount: z.number().min(0).optional(),
  objective: z.string().trim().max(2000).optional().nullable(),
  ownerUserId: optionalUuidField,
  partyGroupId: optionalUuidField,
  expectedResponseCount: z.number().int().min(0).optional(),
  notes: optionalText,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateCampaignSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  campaignType: z
    .enum([
      CAMPAIGN_TYPE_CODES.EMAIL,
      CAMPAIGN_TYPE_CODES.EVENT,
      CAMPAIGN_TYPE_CODES.REFERRAL,
      CAMPAIGN_TYPE_CODES.ADVERTISING,
      CAMPAIGN_TYPE_CODES.PARTNER,
    ])
    .optional(),
  startAt: optionalDateField,
  endAt: optionalDateField,
  budgetAmount: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  objective: z.string().trim().max(2000).optional().nullable(),
  ownerUserId: optionalUuidField,
  partyGroupId: optionalUuidField,
  expectedResponseCount: z.number().int().min(0).optional(),
  notes: optionalText,
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const campaignSearchFiltersSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: z
    .enum([
      CAMPAIGN_STATUS_CODES.PLANNED,
      CAMPAIGN_STATUS_CODES.ACTIVE,
      CAMPAIGN_STATUS_CODES.COMPLETED,
      CAMPAIGN_STATUS_CODES.CANCELLED,
    ])
    .optional(),
  campaignType: z
    .enum([
      CAMPAIGN_TYPE_CODES.EMAIL,
      CAMPAIGN_TYPE_CODES.EVENT,
      CAMPAIGN_TYPE_CODES.REFERRAL,
      CAMPAIGN_TYPE_CODES.ADVERTISING,
      CAMPAIGN_TYPE_CODES.PARTNER,
    ])
    .optional(),
  ownerUserId: uuidField.optional(),
  partyGroupId: uuidField.optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const campaignIdParamSchema = z.object({
  campaignId: uuidField,
});

export const campaignMemberIdParamSchema = campaignIdParamSchema.extend({
  memberId: uuidField,
});

export const markMemberStatusSchema = z.object({
  memberStatus: z.enum([
    CAMPAIGN_MEMBER_STATUS_CODES.TARGETED,
    CAMPAIGN_MEMBER_STATUS_CODES.SENT,
    CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
    CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
    CAMPAIGN_MEMBER_STATUS_CODES.OPTED_OUT,
  ]),
  outreachChannel: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignSearchFiltersInput = z.infer<
  typeof campaignSearchFiltersSchema
>;
