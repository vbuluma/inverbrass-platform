/**
 * Purpose:
 * CRM Foundation view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type { WorkAssignmentSummaryView } from "@/core/work-assignment-sla";
import type { PartyTimelineListResult } from "@/core/party-timeline";
import type { PartyRelationshipsPanelView } from "@/modules/party/types";

export type CrmReferenceOption = {
  code: string;
  name: string;
  description?: string | null;
};

export type CrmPartyOption = {
  partyId: string;
  partyNumber: string;
  displayName: string;
  partyTypeCode: string;
};

export type CrmBranchOption = {
  branchId: string;
  branchName: string;
  branchCode: string;
};

export type CrmRegistrationCatalogues = {
  crmTypes: CrmReferenceOption[];
  crmStatuses: CrmReferenceOption[];
  branches: CrmBranchOption[];
  ownerParties: CrmPartyOption[];
  sourceCodes: CrmReferenceOption[];
  recordSources: CrmReferenceOption[];
};

export type CreateCrmRecordPayload = {
  partyId: string;
  crmTypeCode: string;
  statusCode?: string;
  ownerPartyId?: string | null;
  relationshipManagerPartyId?: string | null;
  branchId?: string | null;
  sourceCode?: string | null;
  recordSource?: string;
};

export type UpdateCrmRecordPayload = {
  crmTypeCode?: string;
  ownerPartyId?: string | null;
  relationshipManagerPartyId?: string | null;
  branchId?: string | null;
  sourceCode?: string | null;
  version: number;
};

export type CrmStatusTransitionPayload = {
  statusCode: string;
  version: number;
};

export type CrmSummaryView = {
  crmId: string;
  partyId: string;
  customerNumber: string;
  displayName: string;
  partyTypeCode: string;
  crmTypeCode: string;
  crmTypeName: string;
  statusCode: string;
  statusName: string;
  ownerPartyId: string | null;
  ownerDisplayName: string | null;
  branchId: string | null;
  branchName: string | null;
  customerSince: string;
  updatedAt: string;
};

export type CrmDetailView = CrmSummaryView & {
  relationshipManagerPartyId: string | null;
  relationshipManagerDisplayName: string | null;
  sourceCode: string | null;
  sourceName: string | null;
  recordSource: string;
  notes: string | null;
  version: number;
  assignmentSummary: WorkAssignmentSummaryView | null;
};

export type CrmDashboardView = {
  totalCustomers: number;
  prospectCount: number;
  leadCount: number;
  activeCount: number;
  dormantCount: number;
  recentlyUpdated: CrmSummaryView[];
  statusSummary: Array<{ statusCode: string; statusName: string; count: number }>;
  typeSummary: Array<{ typeCode: string; typeName: string; count: number }>;
  customerLabel: string;
  customersLabel: string;
};

export type CrmListFilters = {
  search?: string;
  statusCode?: string;
  crmTypeCode?: string;
  ownerPartyId?: string;
  branchId?: string;
  limit?: number;
  offset?: number;
};

export type CrmListView = {
  items: CrmSummaryView[];
  total: number;
  limit: number;
  offset: number;
};

export type Customer360IdentityPanelView = {
  partyId: string;
  customerNumber: string;
  displayName: string;
  partyTypeCode: string;
  partyTypeName: string;
  crmTypeName: string;
  statusName: string;
  ownerDisplayName: string | null;
  relationshipManagerDisplayName: string | null;
  branchName: string | null;
  customerSince: string;
  sourceName: string | null;
  preferredChannel: string | null;
};

export type Customer360InsightTile = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  status?: "default" | "warning" | "success" | "danger";
};

export type Customer360WidgetSummary = {
  id: string;
  sourceIp: string;
  title: string;
  label: string;
  value: string;
  hint?: string;
  status?: "default" | "warning" | "success" | "danger";
  href?: string;
  unavailable?: boolean;
};

export type Customer360WidgetSlotView = {
  config: {
    id: string;
    sourceIp: string;
    ownerModule: string;
    title: string;
    zone: string;
    order: number;
    enabled: boolean;
    placeholderHint: string;
    futureBuildPack?: string;
  };
  summary: Customer360WidgetSummary;
  state: "active" | "placeholder" | "error";
};

export type Customer360ZoneView = {
  zone: "business-summary" | "insights" | "health";
  label: string;
  slots: Customer360WidgetSlotView[];
};

/** Composition-layer view — metadata-driven zones with extensible widget slots. */
export type Customer360CompositionView = {
  layoutProfile: "individual" | "entity";
  identity: Customer360IdentityPanelView;
  assignmentSummary: WorkAssignmentSummaryView | null;
  relationships: PartyRelationshipsPanelView;
  /** Read-only feed from BP-002 Party Timeline — CRM does not own timeline storage. */
  partyTimeline: PartyTimelineListResult;
  partyTimelineSource: "BP-002 Party Timeline";
  zones: Customer360ZoneView[];
  widgetConfigs: Array<{
    id: string;
    sourceIp: string;
    ownerModule: string;
    title: string;
    zone: string;
    order: number;
    enabled: boolean;
    placeholderHint: string;
    futureBuildPack?: string;
  }>;
};

/** @deprecated Use Customer360CompositionView — retained for transitional imports. */
export type Customer360PanelView = Customer360CompositionView & {
  insights: Customer360InsightTile[];
  widgetSummaries: Customer360WidgetSummary[];
  timeline: PartyTimelineListResult;
};
