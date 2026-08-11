/**
 * Purpose:
 * View and payload types for BP-004 / IP-05 Activity & Task Management.
 */

import type {
  CrmActivityEntityTypeCode,
  CrmActivityListView,
  CrmActivityOutcomeCode,
  CrmActivityPriorityCode,
  CrmActivityRecordSourceCode,
  CrmActivityStatusCode,
  CrmActivityTypeCode,
} from "@/modules/crm-activity/constants";

export type CrmActivityEntityLinkPayload = {
  entityTypeCode: CrmActivityEntityTypeCode | string;
  entityId: string;
  isPrimary?: boolean;
};

export type CreateCrmActivityPayload = {
  activityTypeCode: CrmActivityTypeCode | string;
  subject: string;
  description?: string | null;
  priorityCode?: CrmActivityPriorityCode | string;
  dueDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  ownerUserId: string;
  primaryPartyId: string;
  entityLinks?: CrmActivityEntityLinkPayload[];
  recordSourceCode?: CrmActivityRecordSourceCode | string;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
};

export type UpdateCrmActivityPayload = {
  subject?: string;
  description?: string | null;
  priorityCode?: CrmActivityPriorityCode | string;
  dueDate?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  ownerUserId?: string;
  addendumNotes?: string | null;
};

export type CompleteCrmActivityPayload = {
  outcomeCode: CrmActivityOutcomeCode | string;
  outcomeNotes?: string | null;
};

export type CancelCrmActivityPayload = {
  cancelReason: string;
};

export type DeferCrmActivityPayload = {
  deferReason: string;
  deferredUntil: string;
};

export type ReassignCrmActivityPayload = {
  ownerUserId: string;
  reason?: string | null;
};

export type CrmActivityListFilters = {
  view?: CrmActivityListView | string;
  activityTypeCode?: string;
  statusCode?: string;
  ownerUserId?: string;
  primaryPartyId?: string;
  entityTypeCode?: string;
  entityId?: string;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
};

export type CrmActivityEntityLinkView = {
  id: string;
  entityTypeCode: string;
  entityTypeLabel: string;
  entityId: string;
  isPrimary: boolean;
};

export type CrmActivitySummaryView = {
  id: string;
  activityNumber: string;
  activityTypeCode: CrmActivityTypeCode;
  activityTypeLabel: string;
  subject: string;
  statusCode: CrmActivityStatusCode;
  statusLabel: string;
  priorityCode: CrmActivityPriorityCode;
  priorityLabel: string;
  dueDate: string | null;
  ownerUserId: string;
  ownerDisplayName: string;
  primaryPartyId: string;
  primaryPartyDisplayName: string;
  isOverdue: boolean;
  completedAt: string | null;
  updatedAt: string;
};

export type CrmActivityDetailView = CrmActivitySummaryView & {
  description: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  outcomeCode: string | null;
  outcomeLabel: string | null;
  outcomeNotes: string | null;
  cancelReason: string | null;
  deferReason: string | null;
  deferredUntil: string | null;
  recordSourceCode: string;
  recordSourceLabel: string;
  sourceReferenceType: string | null;
  sourceReferenceId: string | null;
  entityLinks: CrmActivityEntityLinkView[];
  createdAt: string;
  version: number;
  editable: boolean;
};

export type CrmActivityDashboardView = {
  totalOpen: number;
  myOpen: number;
  overdue: number;
  dueThisWeek: number;
  completedThisMonth: number;
  recentActivities: CrmActivitySummaryView[];
};

export type CrmActivityRegistrationCatalogues = {
  activityTypes: Array<{ code: string; label: string }>;
  priorities: Array<{ code: string; label: string }>;
  outcomes: Array<{ code: string; label: string }>;
  entityTypes: Array<{ code: string; label: string }>;
  owners: Array<{ id: string; displayName: string }>;
};

export type CrmActivityCustomer360Contribution = {
  recentActivities: CrmActivitySummaryView[];
  openTasks: CrmActivitySummaryView[];
  overdueTasks: CrmActivitySummaryView[];
  upcomingActivities: CrmActivitySummaryView[];
  openTasksCount: number;
  overdueTasksCount: number;
  upcomingActivitiesCount: number;
  nextFollowUpDate: string | null;
};
