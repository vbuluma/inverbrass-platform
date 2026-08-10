/**
 * View and payload types for BP-004 / IP-06 Calendar & Appointment Management.
 */

import type {
  CrmAppointmentEntityTypeCode,
  CrmAppointmentListView,
  CrmAppointmentParticipantKind,
  CrmAppointmentStatusCode,
  CrmAppointmentTypeCode,
} from "@/modules/crm-appointment/constants";

export type CrmAppointmentParticipantPayload = {
  participantKind: CrmAppointmentParticipantKind | string;
  userId?: string | null;
  externalPartyId?: string | null;
  displayName?: string | null;
  responseStatusCode?: string;
  isOrganizer?: boolean;
};

export type CrmAppointmentEntityLinkPayload = {
  entityTypeCode: CrmAppointmentEntityTypeCode | string;
  entityId: string;
  isPrimary?: boolean;
};

export type CreateCrmAppointmentPayload = {
  appointmentTypeCode: CrmAppointmentTypeCode | string;
  subject: string;
  description?: string | null;
  startDateTime: string;
  endDateTime: string;
  location?: string | null;
  virtualMeetingUrl?: string | null;
  ownerUserId: string;
  primaryPartyId: string;
  participants?: CrmAppointmentParticipantPayload[];
  entityLinks?: CrmAppointmentEntityLinkPayload[];
};

export type UpdateCrmAppointmentPayload = {
  subject?: string;
  description?: string | null;
  startDateTime?: string;
  endDateTime?: string;
  location?: string | null;
  virtualMeetingUrl?: string | null;
  ownerUserId?: string;
};

export type UpdateCrmAppointmentMinutesPayload = {
  meetingNotes?: string | null;
  decisions?: string | null;
  actionItemsSummary?: string | null;
};

export type CancelCrmAppointmentPayload = {
  cancelReason: string;
};

export type CompleteCrmAppointmentPayload = {
  outcomeNotes?: string | null;
};

export type NoShowCrmAppointmentPayload = {
  noShowReason: string;
  suggestFollowUpTask?: boolean;
};

export type CrmAppointmentListFilters = {
  view?: CrmAppointmentListView | string;
  appointmentTypeCode?: string;
  statusCode?: string;
  ownerUserId?: string;
  primaryPartyId?: string;
  startFrom?: string;
  startTo?: string;
  search?: string;
};

export type CrmAppointmentParticipantView = {
  id: string;
  participantKind: string;
  userId: string | null;
  externalPartyId: string | null;
  displayName: string;
  responseStatusCode: string;
  isOrganizer: boolean;
};

export type CrmAppointmentEntityLinkView = {
  id: string;
  entityTypeCode: string;
  entityTypeLabel: string;
  entityId: string;
  isPrimary: boolean;
};

export type CrmAppointmentSummaryView = {
  id: string;
  appointmentNumber: string;
  appointmentTypeCode: CrmAppointmentTypeCode;
  appointmentTypeLabel: string;
  subject: string;
  statusCode: CrmAppointmentStatusCode;
  statusLabel: string;
  startDateTime: string;
  endDateTime: string;
  location: string | null;
  ownerUserId: string;
  ownerDisplayName: string;
  primaryPartyId: string;
  primaryPartyDisplayName: string;
  linkedActivityId: string | null;
  updatedAt: string;
};

export type CrmAppointmentDetailView = CrmAppointmentSummaryView & {
  description: string | null;
  virtualMeetingUrl: string | null;
  cancelReason: string | null;
  noShowReason: string | null;
  outcomeNotes: string | null;
  meetingNotes: string | null;
  decisions: string | null;
  actionItemsSummary: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  noShowAt: string | null;
  participants: CrmAppointmentParticipantView[];
  entityLinks: CrmAppointmentEntityLinkView[];
  isEditable: boolean;
  schedulingConflicts?: Array<{
    id: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
  }>;
  suggestedSlots?: Array<{ startDateTime: string; endDateTime: string }>;
};

export type CrmAppointmentAvailabilityCheck = {
  available: boolean;
  conflicts: Array<{
    id: string;
    subject: string;
    startDateTime: string;
    endDateTime: string;
  }>;
  suggestedSlots: Array<{ startDateTime: string; endDateTime: string }>;
};

export type CrmAppointmentRegistrationCatalogues = {
  appointmentTypes: Array<{
    code: string;
    name: string;
    defaultDurationMinutes: number;
  }>;
  owners: Array<{
    id: string;
    displayName: string;
  }>;
};

export type CrmAppointmentDashboardView = {
  totalScheduled: number;
  myScheduled: number;
  upcomingThisWeek: number;
  completedThisMonth: number;
  noShowThisMonth: number;
  recentAppointments: CrmAppointmentSummaryView[];
  calendarWeek: CrmAppointmentSummaryView[];
};

export type CrmAppointmentCalendarDayView = {
  date: string;
  appointments: CrmAppointmentSummaryView[];
};

export type CrmAppointmentCustomer360Contribution = {
  upcomingAppointments: CrmAppointmentSummaryView[];
  recentAppointments: CrmAppointmentSummaryView[];
  upcomingCount: number;
};
