/**
 * Purpose:
 * Opportunity Management view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import type { WorkAssignmentSummaryView } from "@/core/work-assignment-sla";
import type { CrmBranchOption, CrmPartyOption, CrmReferenceOption } from "@/modules/crm/types";

export type OpportunityRegistrationCatalogues = {
  pipelines: Array<CrmReferenceOption & { id: string }>;
  stages: Array<
    CrmReferenceOption & {
      pipelineCode: string;
      defaultProbability: number;
      isClosedWon: boolean;
      isClosedLost: boolean;
    }
  >;
  lossReasons: CrmReferenceOption[];
  branches: CrmBranchOption[];
  ownerParties: CrmPartyOption[];
};

export type CreateOpportunityPayload = {
  crmRecordId: string;
  name: string;
  pipelineCode?: string;
  stageCode?: string;
  accountId?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  primaryContactPartyId?: string | null;
  expectedCloseDate?: string | null;
  amount?: string | null;
  currencyCode?: string | null;
  probability?: number | null;
  sourceLeadId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type UpdateOpportunityPayload = {
  name?: string;
  accountId?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  primaryContactPartyId?: string | null;
  expectedCloseDate?: string | null;
  amount?: string | null;
  currencyCode?: string | null;
  probability?: number | null;
  version: number;
};

export type OpportunityStageTransitionPayload = {
  stageCode: string;
  version: number;
  lossReasonCode?: string | null;
  competitorCode?: string | null;
  closeNotes?: string | null;
  finalAmount?: string | null;
};

export type OpportunityLineItemPayload = {
  productId: string;
  quantity?: string;
  unitPrice?: string | null;
  notes?: string | null;
};

export type OpportunitySummaryView = {
  opportunityId: string;
  opportunityNumber: string;
  name: string;
  crmRecordId: string;
  partyId: string;
  displayName: string;
  statusCode: string;
  statusName: string;
  stageCode: string;
  stageName: string;
  pipelineCode: string;
  pipelineName: string;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  amount: string | null;
  currencyCode: string | null;
  probability: number;
  weightedAmount: string | null;
  expectedCloseDate: string | null;
  updatedAt: string;
};

export type OpportunityLineItemView = {
  lineItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: string;
  unitPrice: string | null;
  lineAmount: string | null;
  notes: string | null;
};

export type OpportunityDetailView = OpportunitySummaryView & {
  accountId: string | null;
  accountName: string | null;
  sourceLeadId: string | null;
  sourceLeadNumber: string | null;
  branchId: string | null;
  branchName: string | null;
  primaryContactPartyId: string | null;
  primaryContactDisplayName: string | null;
  lossReasonCode: string | null;
  lossReasonName: string | null;
  competitorCode: string | null;
  closeNotes: string | null;
  closedAt: string | null;
  metadata: Record<string, unknown> | null;
  version: number;
  lineItems: OpportunityLineItemView[];
  assignmentSummary: WorkAssignmentSummaryView | null;
};

export type OpportunityDashboardView = {
  totalOpen: number;
  totalWon: number;
  totalLost: number;
  pipelineValue: string;
  weightedForecast: string;
  recentlyUpdated: OpportunitySummaryView[];
  stageSummary: Array<{ stageCode: string; stageName: string; count: number }>;
};

export type OpportunityListFilters = {
  search?: string;
  statusCode?: string;
  stageCode?: string;
  pipelineCode?: string;
  ownerPartyId?: string;
  crmRecordId?: string;
  partyId?: string;
  limit?: number;
  offset?: number;
};

export type OpportunityListView = {
  items: OpportunitySummaryView[];
  total: number;
  limit: number;
  offset: number;
};

export type OpenOpportunitiesWidgetSummary = {
  openCount: number;
  pipelineValue: string;
  weightedForecast: string;
  largestOpportunity: OpportunitySummaryView | null;
};

export type LeadConversionOpportunityInput = {
  leadId: string;
  leadNumber: string;
  crmRecordId: string;
  partyId: string;
  ownerPartyId: string | null;
  branchId: string | null;
  sourceCode: string;
  qualificationScore: number | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  accountId?: string | null;
  opportunityName?: string;
};
