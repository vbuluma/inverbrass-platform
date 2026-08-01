/**
 * Purpose:
 * Zod validators for Offering Governance operations.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { z } from "zod";

import { OFFERING_GOVERNANCE_STATUS_CODES } from "@/modules/product/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalPartyId = z.string().uuid().optional().or(z.literal(""));

const governanceStatusValues = [
  OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED,
  OFFERING_GOVERNANCE_STATUS_CODES.IN_PROGRESS,
  OFFERING_GOVERNANCE_STATUS_CODES.READY,
  OFFERING_GOVERNANCE_STATUS_CODES.ON_HOLD,
  OFFERING_GOVERNANCE_STATUS_CODES.NON_COMPLIANT,
  OFFERING_GOVERNANCE_STATUS_CODES.ARCHIVED,
] as const;

export const offeringGovernanceFiltersSchema = z.object({
  query: optionalText,
  governanceStatus: z.enum(governanceStatusValues).optional(),
  ownerPartyId: optionalPartyId,
  readinessMin: z.coerce.number().min(0).max(100).optional(),
  readinessMax: z.coerce.number().min(0).max(100).optional(),
});

export const updateOfferingGovernanceOwnershipSchema = z.object({
  offeringId: z.string().uuid("A valid offering identifier is required."),
  responsibleBusinessOwnerPartyId: optionalPartyId,
  technicalOwnerPartyId: optionalPartyId,
  productStewardPartyId: optionalPartyId,
});

export const updateOfferingGovernanceNotesSchema = z.object({
  offeringId: z.string().uuid("A valid offering identifier is required."),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const runOfferingGovernanceValidationSchema = z.object({
  offeringId: z.string().uuid("A valid offering identifier is required."),
});

export const toggleOfferingGovernanceLockSchema = z.object({
  offeringId: z.string().uuid("A valid offering identifier is required."),
  isLocked: z.boolean(),
});

export const updateOfferingGovernanceStatusSchema = z.object({
  offeringId: z.string().uuid("A valid offering identifier is required."),
  governanceStatus: z.enum(governanceStatusValues),
});
