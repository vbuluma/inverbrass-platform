/**
 * Purpose:
 * Lead Management view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import type { WorkAssignmentSummaryView } from "@/core/work-assignment-sla";
import type { CrmBranchOption, CrmPartyOption, CrmReferenceOption } from "@/modules/crm/types";

export type LeadRegistrationCatalogues = {
  leadStatuses: CrmReferenceOption[];
  leadSources: CrmReferenceOption[];
  disqualificationReasons: CrmReferenceOption[];
  channels: CrmReferenceOption[];
  branches: CrmBranchOption[];
  ownerParties: CrmPartyOption[];
};

export type CreateLeadPayload = {
  partyId: string;
  sourceCode: string;
  channelCode?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type UpdateLeadPayload = {
  sourceCode?: string;
  channelCode?: string | null;
  ownerPartyId?: string | null;
  branchId?: string | null;
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  qualificationScore?: number | null;
  notes?: string | null;
  version: number;
};

export type LeadStatusTransitionPayload = {
  statusCode: string;
  version: number;
  disqualificationReasonCode?: string | null;
};

export type LeadDisqualifyPayload = {
  reasonCode: string;
  version: number;
};

export type LeadConvertPayload = {
  version: number;
  crmTypeCode?: string;
  createCrmIfMissing?: boolean;
  /** Default true — creates opportunity per Lead Conversion Contract. */
  createOpportunity?: boolean;
  opportunityName?: string;
};

export type LeadSummaryView = {
  leadId: string;
  partyId: string;
  leadNumber: string;
  displayName: string;
  partyNumber: string;
  statusCode: string;
  statusName: string;
  sourceCode: string;
  sourceName: string;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  branchId: string | null;
  branchName: string | null;
  email: string | null;
  phone: string | null;
  qualificationScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadDetailView = LeadSummaryView & {
  channelCode: string | null;
  channelName: string | null;
  companyName: string | null;
  contactName: string | null;
  convertedCrmId: string | null;
  convertedAt: string | null;
  disqualificationReasonCode: string | null;
  disqualificationReasonName: string | null;
  notes: string | null;
  version: number;
  assignmentSummary: WorkAssignmentSummaryView | null;
  duplicateWarnings: string[];
};

export type LeadDashboardView = {
  totalLeads: number;
  newCount: number;
  contactedCount: number;
  qualifiedCount: number;
  convertedCount: number;
  unqualifiedCount: number;
  recentlyUpdated: LeadSummaryView[];
  statusSummary: Array<{ statusCode: string; statusName: string; count: number }>;
  sourceSummary: Array<{ sourceCode: string; sourceName: string; count: number }>;
};

export type LeadListFilters = {
  search?: string;
  statusCode?: string;
  sourceCode?: string;
  ownerPartyId?: string;
  branchId?: string;
  limit?: number;
  offset?: number;
};

export type LeadListView = {
  items: LeadSummaryView[];
  total: number;
  limit: number;
  offset: number;
};

export type ActiveLeadWidgetSummary = {
  leadId: string;
  leadNumber: string;
  statusCode: string;
  statusName: string;
  sourceName: string | null;
  ownerDisplayName: string | null;
  statusTone: "default" | "warning" | "success" | "danger";
};
