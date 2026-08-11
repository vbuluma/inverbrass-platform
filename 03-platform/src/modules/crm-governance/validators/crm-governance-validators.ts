/**
 * Purpose:
 * Zod validators for CRM Governance operations.
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import { z } from "zod";

import {
  CRM_APPROVAL_ACTION_CODES,
  CRM_GOVERNANCE_STATUS_CODES,
  CRM_SLA_ENTITY_TYPE_CODES,
} from "@/modules/crm-governance/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalUserId = z.string().uuid().optional().or(z.literal(""));

const governanceStatusValues = [
  CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED,
  CRM_GOVERNANCE_STATUS_CODES.IN_PROGRESS,
  CRM_GOVERNANCE_STATUS_CODES.READY,
  CRM_GOVERNANCE_STATUS_CODES.ON_HOLD,
  CRM_GOVERNANCE_STATUS_CODES.NON_COMPLIANT,
  CRM_GOVERNANCE_STATUS_CODES.ARCHIVED,
] as const;

const slaEntityTypeValues = [
  CRM_SLA_ENTITY_TYPE_CODES.CASE,
  CRM_SLA_ENTITY_TYPE_CODES.VISIT_REPORT,
  CRM_SLA_ENTITY_TYPE_CODES.ACTIVITY,
  CRM_SLA_ENTITY_TYPE_CODES.APPOINTMENT,
] as const;

const approvalActionValues = [
  CRM_APPROVAL_ACTION_CODES.MERGE,
  CRM_APPROVAL_ACTION_CODES.ACTIVATION,
  CRM_APPROVAL_ACTION_CODES.REOPEN_CASE,
  CRM_APPROVAL_ACTION_CODES.ARCHIVE,
] as const;

export const crmGovernanceFiltersSchema = z.object({
  query: optionalText,
  governanceStatus: z.enum(governanceStatusValues).optional(),
  readinessMin: z.coerce.number().min(0).max(100).optional(),
  readinessMax: z.coerce.number().min(0).max(100).optional(),
});

export const updateCrmGovernanceOwnershipSchema = z.object({
  partyId: z.string().uuid("A valid party identifier is required."),
  ownerUserId: optionalUserId,
  relationshipManagerUserId: optionalUserId,
  stewardUserId: optionalUserId,
});

export const updateCrmGovernanceNotesSchema = z.object({
  partyId: z.string().uuid("A valid party identifier is required."),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const runCrmGovernanceValidationSchema = z.object({
  partyId: z.string().uuid("A valid party identifier is required."),
});

export const toggleCrmGovernanceLockSchema = z.object({
  partyId: z.string().uuid("A valid party identifier is required."),
  isLocked: z.boolean(),
});

export const detectCrmDuplicatesSchema = z.object({
  partyId: z.string().uuid("A valid party identifier is required."),
});

export const mergeProposalActionSchema = z.object({
  proposalId: z.string().uuid("A valid merge proposal identifier is required."),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const upsertCrmSlaPolicySchema = z.object({
  id: z.string().uuid().optional(),
  entityTypeCode: z.enum(slaEntityTypeValues),
  priorityCode: z.string().trim().max(50).optional().nullable().or(z.literal("")),
  name: z.string().trim().min(1).max(200),
  firstResponseTargetHours: z.coerce.number().int().min(0).optional().nullable(),
  resolutionTargetHours: z.coerce.number().int().min(1),
  pauseReasonCodes: z.array(z.string()).optional(),
  escalationEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const upsertCrmBusinessHoursSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format."),
  isClosed: z.boolean().optional(),
  timezone: z.string().trim().max(80).optional(),
});

export const upsertCrmHolidaySchema = z.object({
  id: z.string().uuid().optional(),
  holidayDate: z.string().min(1, "Holiday date is required."),
  name: z.string().trim().min(1).max(200),
  isRecurring: z.boolean().optional(),
});

export const upsertCrmApprovalMatrixSchema = z.object({
  id: z.string().uuid().optional(),
  actionCode: z.enum(approvalActionValues),
  minRoleCode: z.string().trim().min(1).max(80),
  requiresDualApproval: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
