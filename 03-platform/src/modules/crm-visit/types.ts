import type {
  CrmVisitListView,
  CrmVisitStatusCode,
  CrmVisitTypeCode,
} from "@/modules/crm-visit/constants";

export type CreateCrmVisitPayload = {
  visitTypeCode: CrmVisitTypeCode | string;
  subject: string;
  visitDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  objectives?: string | null;
  agenda?: string | null;
  priorityCode?: string;
  ownerUserId: string;
  primaryPartyId: string;
  linkedAppointmentId?: string | null;
};

export type UpdateCrmVisitPayload = {
  subject?: string;
  location?: string | null;
  objectives?: string | null;
  agenda?: string | null;
  priorityCode?: string;
  startTime?: string | null;
  endTime?: string | null;
};

export type UpdateCrmVisitReportPayload = {
  agenda?: string | null;
  discussion?: string | null;
  decisions?: string | null;
  risks?: string | null;
  nextSteps?: string | null;
  minutesSummary?: string | null;
};

export type SubmitCrmVisitPayload = {
  submitterNotes?: string | null;
};

export type ReviewCrmVisitPayload = {
  reviewerComments: string;
};

export type AddCrmVisitActionItemPayload = {
  title: string;
  description?: string | null;
  ownerUserId: string;
  dueDate: string;
  priorityCode?: string;
};

export type UpdateCrmVisitActionItemPayload = {
  statusCode?: string;
  description?: string | null;
  dueDate?: string;
};

export type AddCrmVisitAttendeePayload = {
  displayName: string;
  partyId?: string | null;
  positionTitle?: string | null;
  email?: string | null;
  mobile?: string | null;
  organisation?: string | null;
  wasPresent?: boolean;
};

export type CrmVisitListFilters = {
  view?: CrmVisitListView | string;
  visitTypeCode?: string;
  statusCode?: string;
  ownerUserId?: string;
  primaryPartyId?: string;
  search?: string;
};

export type CrmVisitActionItemView = {
  id: string;
  title: string;
  description: string | null;
  ownerUserId: string;
  ownerDisplayName: string;
  dueDate: string;
  priorityCode: string;
  statusCode: string;
  linkedActivityId: string | null;
};

export type CrmVisitAttendeeView = {
  id: string;
  displayName: string;
  partyId: string | null;
  positionTitle: string | null;
  email: string | null;
  organisation: string | null;
  wasPresent: boolean;
};

export type CrmVisitParticipantView = {
  id: string;
  userId: string;
  displayName: string;
  isPrimaryAuthor: boolean;
};

export type CrmVisitSummaryView = {
  id: string;
  visitNumber: string;
  visitTypeCode: CrmVisitTypeCode;
  visitTypeLabel: string;
  subject: string;
  statusCode: CrmVisitStatusCode;
  statusLabel: string;
  visitDate: string;
  ownerUserId: string;
  ownerDisplayName: string;
  primaryPartyId: string;
  primaryPartyDisplayName: string;
  linkedAppointmentId: string | null;
  reportDueAt: string | null;
  updatedAt: string;
};

export type CrmVisitDetailView = CrmVisitSummaryView & {
  location: string | null;
  objectives: string | null;
  agenda: string | null;
  discussion: string | null;
  decisions: string | null;
  risks: string | null;
  nextSteps: string | null;
  minutesSummary: string | null;
  priorityCode: string;
  startTime: string | null;
  endTime: string | null;
  submitterNotes: string | null;
  reviewerComments: string | null;
  isEditable: boolean;
  participants: CrmVisitParticipantView[];
  attendees: CrmVisitAttendeeView[];
  actionItems: CrmVisitActionItemView[];
  documents: Array<{ id: string; fileName: string; storageKey: string }>;
};

export type CrmVisitRegistrationCatalogues = {
  visitTypes: Array<{ code: string; name: string }>;
  owners: Array<{ id: string; displayName: string }>;
};

export type CrmVisitDashboardView = {
  totalDraft: number;
  pendingApproval: number;
  myOpenActionItems: number;
  approvedThisMonth: number;
  recentVisits: CrmVisitSummaryView[];
};

export type CrmVisitCustomer360Contribution = {
  upcomingVisits: CrmVisitSummaryView[];
  recentVisits: CrmVisitSummaryView[];
  openActionItems: CrmVisitActionItemView[];
  pendingApprovals: number;
};
