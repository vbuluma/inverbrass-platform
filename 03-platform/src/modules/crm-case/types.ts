import type {
  CrmCaseListView,
  CrmCasePriorityCode,
  CrmCaseSeverityCode,
  CrmCaseStatusCode,
  CrmCaseTypeCode,
} from "@/modules/crm-case/constants";

export type CreateCrmCasePayload = {
  caseTypeCode: CrmCaseTypeCode | string;
  categoryCode?: string | null;
  subcategoryCode?: string | null;
  subject: string;
  description: string;
  priorityCode?: CrmCasePriorityCode | string;
  severityCode?: CrmCaseSeverityCode | string;
  channelCode?: string | null;
  ownerUserId?: string | null;
  queueCode?: string | null;
  primaryPartyId: string;
  primaryContactPartyId?: string | null;
  linkedCommunicationId?: string | null;
  createFollowUpTask?: boolean;
};

export type UpdateCrmCasePayload = {
  subject?: string;
  description?: string;
  categoryCode?: string | null;
  subcategoryCode?: string | null;
  priorityCode?: string;
  severityCode?: string;
  channelCode?: string | null;
  queueCode?: string | null;
  primaryContactPartyId?: string | null;
  linkedCommunicationId?: string | null;
};

export type AssignCrmCasePayload = {
  ownerUserId: string;
  queueCode?: string | null;
};

export type EscalateCrmCasePayload = {
  reason: string;
  toOwnerUserId?: string | null;
};

export type ResolveCrmCasePayload = {
  resolutionSummary: string;
  resolutionCode: string;
  rootCauseCode?: string | null;
};

export type CloseCrmCasePayload = {
  satisfactionRating?: number | null;
  satisfactionComment?: string | null;
};

export type ReopenCrmCasePayload = {
  reopenReason: string;
};

export type SetPendingCustomerPayload = {
  pauseReasonCode?: string;
};

export type CrmCaseListFilters = {
  view?: CrmCaseListView | string;
  statusCode?: string;
  caseTypeCode?: string;
  priorityCode?: string;
  primaryPartyId?: string;
  search?: string;
};

export type CrmCaseSummaryView = {
  id: string;
  caseNumber: string;
  caseTypeCode: string;
  caseTypeLabel: string;
  subject: string;
  statusCode: string;
  statusLabel: string;
  priorityCode: string;
  priorityLabel: string;
  severityCode: string;
  severityLabel: string;
  primaryPartyId: string;
  primaryPartyDisplayName: string;
  ownerUserId: string | null;
  ownerDisplayName: string | null;
  queueCode: string | null;
  openedAt: string;
  slaResolutionDueAt: string | null;
  slaBreachedAt: string | null;
  slaPolicyId: string | null;
  subcategoryCode: string | null;
  escalationLevel: number;
  slaRemainingMs: number | null;
  isSlaAtRisk: boolean;
  isSlaBreached: boolean;
  isOverdue: boolean;
  isEscalated: boolean;
  updatedAt: string;
};

export type CrmCaseEscalationView = {
  id: string;
  fromOwnerUserId: string | null;
  toOwnerUserId: string | null;
  reason: string;
  triggeredBy: string;
  createdAt: string;
};

export type CrmCaseDetailView = CrmCaseSummaryView & {
  categoryCode: string | null;
  description: string;
  channelCode: string | null;
  primaryContactPartyId: string | null;
  linkedCommunicationId: string | null;
  resolutionSummary: string | null;
  resolutionCode: string | null;
  rootCauseCode: string | null;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  escalatedAt: string | null;
  slaFirstResponseDueAt: string | null;
  slaAtRiskAt: string | null;
  slaPausedAt: string | null;
  slaPauseReasonCode: string | null;
  reopenReason: string | null;
  reopenedAt: string | null;
  isEditable: boolean;
  version: number;
  escalations: CrmCaseEscalationView[];
};

export type CrmCaseRegistrationCatalogues = {
  caseTypes: Array<{ code: string; name: string }>;
  priorities: Array<{
    code: string;
    name: string;
    firstResponseTargetHours: number;
    resolutionTargetHours: number;
  }>;
  severities: Array<{
    code: string;
    name: string;
    requiresImmediateOwner: boolean;
  }>;
  resolutionCodes: Array<{ code: string; name: string }>;
  statuses: Array<{ code: string; name: string }>;
  owners: Array<{ id: string; displayName: string }>;
};

export type CrmCaseDashboardView = {
  openCount: number;
  escalatedCount: number;
  overdueCount: number;
  unassignedCount: number;
  recentCases: CrmCaseSummaryView[];
};

export type CrmCaseCustomer360Contribution = {
  openCaseCount: number;
  escalatedCaseCount: number;
  slaAtRiskCount: number;
  breachedCaseCount: number;
  lastComplaint: CrmCaseSummaryView | null;
  openCases: CrmCaseSummaryView[];
  escalatedCases: CrmCaseSummaryView[];
  slaAtRiskCases: CrmCaseSummaryView[];
  breachedCases: CrmCaseSummaryView[];
  recentCases: CrmCaseSummaryView[];
};

export type { CrmCaseStatusCode };
