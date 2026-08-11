/**
 * Purpose:
 * Campaign view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import type {
  CampaignMemberStatusCode,
  CampaignStatusCode,
  CampaignTypeCode,
} from "@/modules/crm/constants";

export type CampaignMemberView = {
  id: string;
  partyId: string;
  partyDisplayName: string | null;
  memberStatus: CampaignMemberStatusCode | string;
  memberStatusLabel: string;
  leadId: string | null;
  opportunityId: string | null;
  consentGranted: boolean;
  outreachChannel: string | null;
  respondedAt: string | null;
  convertedAt: string | null;
  createdAt: string;
};

export type CampaignRoiView = {
  memberCount: number;
  targetedCount: number;
  sentCount: number;
  respondedCount: number;
  convertedCount: number;
  optedOutCount: number;
  responseRate: number;
  conversionRate: number;
  budgetAmount: number;
  actualCost: number;
  costVariance: number;
  /** Pipeline value deferred until IP-03 opportunity amounts available. */
  attributedPipelineValue: number;
};

export type CampaignSummaryView = {
  id: string;
  campaignNumber: string;
  name: string;
  campaignType: CampaignTypeCode | string;
  campaignTypeLabel: string;
  status: CampaignStatusCode | string;
  statusLabel: string;
  startAt: string | null;
  endAt: string | null;
  budgetAmount: number;
  actualCost: number;
  currencyCode: string;
  partyGroupId: string | null;
  ownerUserId: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignDetailView = CampaignSummaryView & {
  objective: string | null;
  expectedResponseCount: number;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  members: CampaignMemberView[];
  roi: CampaignRoiView;
};

export type CampaignSearchFilters = {
  query?: string;
  status?: string;
  campaignType?: string;
  ownerUserId?: string;
  partyGroupId?: string;
  page?: number;
  pageSize?: number;
};

export type CampaignSearchResultView = {
  items: CampaignSummaryView[];
  totalCount: number;
  page: number;
  pageSize: number;
};

export type CampaignDashboardView = {
  totalCount: number;
  plannedCount: number;
  activeCount: number;
  completedCount: number;
  totalBudget: number;
  recent: CampaignSummaryView[];
};

export type CreateCampaignPayload = {
  name: string;
  campaignType: string;
  currencyCode: string;
  startAt?: string;
  endAt?: string;
  budgetAmount?: number;
  objective?: string;
  ownerUserId?: string;
  partyGroupId?: string;
  expectedResponseCount?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
};

export type UpdateCampaignPayload = {
  name?: string;
  campaignType?: string;
  startAt?: string | null;
  endAt?: string | null;
  budgetAmount?: number;
  actualCost?: number;
  objective?: string | null;
  ownerUserId?: string | null;
  partyGroupId?: string | null;
  expectedResponseCount?: number;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type CampaignInsertValues = {
  businessId: string;
  campaignNumber: string;
  name: string;
  campaignType: string;
  status: string;
  startAt?: Date | null;
  endAt?: Date | null;
  budgetAmount?: string;
  actualCost?: string;
  currencyCode: string;
  objective?: string | null;
  ownerUserId?: string | null;
  partyGroupId?: string | null;
  expectedResponseCount?: number;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CampaignUpdateValues = {
  name?: string;
  campaignType?: string;
  status?: string;
  startAt?: Date | null;
  endAt?: Date | null;
  budgetAmount?: string;
  actualCost?: string;
  objective?: string | null;
  ownerUserId?: string | null;
  partyGroupId?: string | null;
  expectedResponseCount?: number;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type CampaignMemberInsertValues = {
  businessId: string;
  campaignId: string;
  partyId: string;
  memberStatus: string;
  leadId?: string | null;
  opportunityId?: string | null;
  consentCheckedAt?: Date | null;
  consentGranted?: boolean;
  outreachChannel?: string | null;
  respondedAt?: Date | null;
  convertedAt?: Date | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CampaignMemberUpdateValues = {
  memberStatus?: string;
  leadId?: string | null;
  opportunityId?: string | null;
  consentCheckedAt?: Date | null;
  consentGranted?: boolean;
  outreachChannel?: string | null;
  respondedAt?: Date | null;
  convertedAt?: Date | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type CampaignCustomer360Contribution = {
  domain: "campaigns";
  widgets: Array<{
    id: string;
    label: string;
    value: string | number;
    tone?: "default" | "warning" | "success";
  }>;
  insights: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
  quickActions: Array<{
    id: string;
    label: string;
    href: string;
  }>;
  timelineEventTypes: string[];
};
