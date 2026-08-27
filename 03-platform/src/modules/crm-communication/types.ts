import type {
  CrmCommunicationChannelCode,
  CrmCommunicationDirectionCode,
  CrmCommunicationListView,
} from "@/modules/crm-communication/constants";

export type CreateCrmCommunicationPayload = {
  channelTypeCode: CrmCommunicationChannelCode | string;
  directionCode: CrmCommunicationDirectionCode | string;
  subject?: string | null;
  summary: string;
  communicatedAt?: string;
  durationSeconds?: number | null;
  templateCode?: string | null;
  threadId?: string | null;
  primaryPartyId: string;
  contactChannelValue?: string | null;
  ownerUserId: string;
  isSensitive?: boolean;
  linkedVisitId?: string | null;
  createFollowUpTask?: boolean;
  allowConsentOverride?: boolean;
};

export type CreateCrmCommunicationAddendumPayload = {
  summary: string;
  subject?: string | null;
};

export type CrmCommunicationListFilters = {
  view?: CrmCommunicationListView | string;
  channelTypeCode?: string;
  directionCode?: string;
  primaryPartyId?: string;
  threadId?: string;
  search?: string;
  from?: string;
  to?: string;
};

export type CrmCommunicationSummaryView = {
  id: string;
  communicationNumber: string;
  channelTypeCode: string;
  channelTypeLabel: string;
  directionCode: string;
  directionLabel: string;
  subject: string | null;
  summary: string;
  communicatedAt: string;
  statusCode: string;
  consentCheckResult: string | null;
  primaryPartyId: string;
  primaryPartyDisplayName: string;
  ownerUserId: string;
  ownerDisplayName: string;
  threadId: string | null;
  isSensitive: boolean;
  updatedAt: string;
};

export type CrmCommunicationDetailView = CrmCommunicationSummaryView & {
  durationSeconds: number | null;
  templateCode: string | null;
  contactChannelValue: string | null;
  linkedActivityId: string | null;
  linkedVisitId: string | null;
  addendumToId: string | null;
  recordSourceCode: string;
  deliveryStatusCode: string | null;
  threadEntries: CrmCommunicationSummaryView[];
};

export type CrmCommunicationRegistrationCatalogues = {
  channels: Array<{
    code: string;
    name: string;
    requiresConsentOutbound: boolean;
  }>;
  owners: Array<{ id: string; displayName: string }>;
};

export type CrmCommunicationDashboardView = {
  totalLast30Days: number;
  outboundLast30Days: number;
  inboundLast30Days: number;
  consentBlockedLast30Days: number;
  recentCommunications: CrmCommunicationSummaryView[];
};

export type CrmCommunicationCustomer360Contribution = {
  lastInteractionChannel: string | null;
  lastInteractionAt: string | null;
  recentCommunicationCount: number;
  recentCommunications: CrmCommunicationSummaryView[];
};
