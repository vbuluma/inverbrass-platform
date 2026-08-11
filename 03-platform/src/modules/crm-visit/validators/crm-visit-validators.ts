import { z } from "zod";

export const createCrmVisitSchema = z.object({
  visitTypeCode: z.string().min(1),
  subject: z.string().min(1).max(300),
  visitDate: z.string().datetime(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  objectives: z.string().max(4000).optional().nullable(),
  agenda: z.string().max(4000).optional().nullable(),
  priorityCode: z.string().optional(),
  ownerUserId: z.string().uuid(),
  primaryPartyId: z.string().uuid(),
  linkedAppointmentId: z.string().uuid().optional().nullable(),
});

export const updateCrmVisitSchema = z.object({
  subject: z.string().min(1).max(300).optional(),
  location: z.string().max(500).optional().nullable(),
  objectives: z.string().max(4000).optional().nullable(),
  agenda: z.string().max(4000).optional().nullable(),
  priorityCode: z.string().optional(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
});

export const updateCrmVisitReportSchema = z.object({
  agenda: z.string().max(4000).optional().nullable(),
  discussion: z.string().max(8000).optional().nullable(),
  decisions: z.string().max(4000).optional().nullable(),
  risks: z.string().max(4000).optional().nullable(),
  nextSteps: z.string().max(4000).optional().nullable(),
  minutesSummary: z.string().max(8000).optional().nullable(),
});

export const submitCrmVisitSchema = z.object({
  submitterNotes: z.string().max(2000).optional().nullable(),
});

export const reviewCrmVisitSchema = z.object({
  reviewerComments: z.string().min(1).max(2000),
});

export const addCrmVisitActionItemSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional().nullable(),
  ownerUserId: z.string().uuid(),
  dueDate: z.string().datetime(),
  priorityCode: z.string().optional(),
});

export const updateCrmVisitActionItemSchema = z.object({
  statusCode: z.string().optional(),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().datetime().optional(),
});

export const addCrmVisitAttendeeSchema = z.object({
  displayName: z.string().min(1).max(200),
  partyId: z.string().uuid().optional().nullable(),
  positionTitle: z.string().max(150).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  mobile: z.string().max(50).optional().nullable(),
  organisation: z.string().max(200).optional().nullable(),
  wasPresent: z.boolean().optional(),
});

export const crmVisitListFiltersSchema = z.object({
  view: z.string().optional(),
  visitTypeCode: z.string().optional(),
  statusCode: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
  primaryPartyId: z.string().uuid().optional(),
  search: z.string().optional(),
});
