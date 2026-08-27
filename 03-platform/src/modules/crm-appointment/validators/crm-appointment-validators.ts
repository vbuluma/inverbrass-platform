/**
 * Zod validators for BP-004 / IP-06 Calendar & Appointment Management.
 */

import { z } from "zod";

export const crmAppointmentParticipantSchema = z.object({
  participantKind: z.string().min(1),
  userId: z.string().uuid().optional().nullable(),
  externalPartyId: z.string().uuid().optional().nullable(),
  displayName: z.string().max(200).optional().nullable(),
  responseStatusCode: z.string().optional(),
  isOrganizer: z.boolean().optional(),
});

export const crmAppointmentEntityLinkSchema = z.object({
  entityTypeCode: z.string().min(1),
  entityId: z.string().uuid(),
  isPrimary: z.boolean().optional(),
});

export const createCrmAppointmentSchema = z.object({
  appointmentTypeCode: z.string().min(1),
  subject: z.string().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  location: z.string().max(500).optional().nullable(),
  virtualMeetingUrl: z.string().max(1000).optional().nullable(),
  ownerUserId: z.string().uuid(),
  primaryPartyId: z.string().uuid(),
  participants: z.array(crmAppointmentParticipantSchema).optional(),
  entityLinks: z.array(crmAppointmentEntityLinkSchema).optional(),
});

export const updateCrmAppointmentSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  description: z.string().max(4000).optional().nullable(),
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  location: z.string().max(500).optional().nullable(),
  virtualMeetingUrl: z.string().max(1000).optional().nullable(),
  ownerUserId: z.string().uuid().optional(),
});

export const updateCrmAppointmentMinutesSchema = z.object({
  meetingNotes: z.string().max(8000).optional().nullable(),
  decisions: z.string().max(4000).optional().nullable(),
  actionItemsSummary: z.string().max(4000).optional().nullable(),
});

export const cancelCrmAppointmentSchema = z.object({
  cancelReason: z.string().min(1).max(500),
});

export const checkCrmAppointmentAvailabilitySchema = z.object({
  ownerUserId: z.string().uuid(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  excludeAppointmentId: z.string().uuid().optional(),
});

export const completeCrmAppointmentSchema = z.object({
  outcomeNotes: z.string().max(2000).optional().nullable(),
});

export const noShowCrmAppointmentSchema = z.object({
  noShowReason: z.string().min(1).max(500),
  suggestFollowUpTask: z.boolean().optional(),
});

export const crmAppointmentListFiltersSchema = z.object({
  view: z.string().optional(),
  appointmentTypeCode: z.string().optional(),
  statusCode: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
  primaryPartyId: z.string().uuid().optional(),
  startFrom: z.string().datetime().optional(),
  startTo: z.string().datetime().optional(),
  search: z.string().optional(),
});
