/**
 * Purpose:
 * Authoritative supplier eligibility check for later BP-009 IPs.
 * Fails closed when required information cannot be established.
 *
 * Implementation Package:
 * BP-009 / IP-01 – Procurement Foundation & Supplier Relationship
 */

import {
  PROCUREMENT_STATUS_CODES,
  PROCUREMENT_STATUS_LABELS,
  QUALIFICATION_STATUS_CODES,
  QUALIFICATION_STATUS_LABELS,
  type ProcurementStatusCode,
  type QualificationStatusCode,
} from "@/modules/procurement/constants";
import {
  effectiveQualificationOutcome,
  isParticipatingStatus,
  isValidQualificationOutcome,
} from "@/modules/procurement/services/procurement-rules";
import type { EligibilityView, ProcurementPartyRef, ProcurementProfileRecord, SupplierQualificationRecord } from "@/modules/procurement/types";

export type EligibilityInput = {
  party: ProcurementPartyRef | null;
  profile: ProcurementProfileRecord | null;
  latestQualification: SupplierQualificationRecord | null;
};

export function evaluateSupplierEligibility(input: EligibilityInput): EligibilityView {
  const reasons: string[] = [];
  const restrictions: string[] = [];
  let actionRequired: string | null = null;

  if (!input.party) {
    return ineligible(null, null, null, false, ["The party could not be found."], "Resolve the party record.");
  }
  if (input.party.businessId && input.profile && input.party.businessId !== input.profile.businessId) {
    return ineligible(input.party.id, input.profile.id, input.profile, false, [
      "This supplier belongs to another business.",
    ], null);
  }
  if (!input.party.hasActiveSupplierRole) {
    reasons.push("The party does not have an active supplier role.");
    actionRequired = "Confirm the supplier role on the party record.";
  }
  if (!input.profile || input.profile.deletedAt) {
    reasons.push("There is no procurement profile for this party.");
    actionRequired = actionRequired ?? "Create a procurement profile.";
    return ineligible(input.party.id, null, null, false, reasons, actionRequired);
  }

  const statusCode = input.profile.statusCode as ProcurementStatusCode;
  const statusLabel =
    PROCUREMENT_STATUS_LABELS[statusCode] ?? input.profile.statusCode;

  if (statusCode === PROCUREMENT_STATUS_CODES.BLACKLISTED) {
    reasons.push(
      input.profile.statusReason
        ? `Blacklisted: ${input.profile.statusReason}`
        : "The supplier is blacklisted."
    );
    actionRequired = "A blacklisted supplier cannot participate in procurement.";
  } else if (statusCode === PROCUREMENT_STATUS_CODES.SUSPENDED) {
    reasons.push(
      input.profile.statusReason
        ? `Suspended: ${input.profile.statusReason}`
        : "The supplier is suspended."
    );
    actionRequired = "Lift the suspension before using this supplier.";
  } else if (statusCode === PROCUREMENT_STATUS_CODES.INACTIVE) {
    reasons.push("The procurement profile is inactive.");
    actionRequired = "Activate the procurement profile.";
  } else if (!isParticipatingStatus(statusCode)) {
    reasons.push("The procurement profile is not in a participating status.");
  }

  const effectiveOutcome = input.latestQualification
    ? effectiveQualificationOutcome(
        input.latestQualification.outcomeCode,
        input.latestQualification.expiryDate
      )
    : QUALIFICATION_STATUS_CODES.PENDING;

  if (!input.latestQualification) {
    reasons.push("Required qualification has not been recorded.");
    actionRequired = actionRequired ?? "Record supplier qualification.";
  } else if (effectiveOutcome === QUALIFICATION_STATUS_CODES.EXPIRED) {
    reasons.push("Required qualification has expired.");
    actionRequired = actionRequired ?? "Qualification review required.";
  } else if (effectiveOutcome === QUALIFICATION_STATUS_CODES.FAILED) {
    reasons.push("Required qualification failed.");
    actionRequired = actionRequired ?? "Record a successful qualification.";
  } else if (effectiveOutcome === QUALIFICATION_STATUS_CODES.PENDING) {
    reasons.push("Qualification is still pending.");
    actionRequired = actionRequired ?? "Complete supplier qualification.";
  } else if (!isValidQualificationOutcome(effectiveOutcome)) {
    reasons.push("Required qualification is not valid.");
    actionRequired = actionRequired ?? "Record a valid qualification.";
  }

  if (effectiveOutcome === QUALIFICATION_STATUS_CODES.CONDITIONAL) {
    restrictions.push("Qualification is conditional.");
  }
  if (statusCode === PROCUREMENT_STATUS_CODES.CONDITIONAL) {
    restrictions.push("Procurement status is conditional.");
  }

  const eligible = reasons.length === 0;

  return {
    eligible,
    partyId: input.party.id,
    profileId: input.profile.id,
    statusCode: input.profile.statusCode,
    statusLabel,
    qualificationStatusCode: effectiveOutcome,
    qualificationLabel: QUALIFICATION_STATUS_LABELS[effectiveOutcome],
    isPreferred: input.profile.isPreferred,
    restrictions,
    reasons: eligible ? [] : reasons,
    actionRequired: eligible ? null : actionRequired,
  };
}

function ineligible(
  partyId: string | null,
  profileId: string | null,
  profile: ProcurementProfileRecord | null,
  isPreferred: boolean,
  reasons: string[],
  actionRequired: string | null
): EligibilityView {
  const qualification = profile
    ? (profile.qualificationStatusCode as QualificationStatusCode)
    : null;
  return {
    eligible: false,
    partyId: partyId ?? "",
    profileId,
    statusCode: profile?.statusCode ?? null,
    statusLabel: profile
      ? PROCUREMENT_STATUS_LABELS[profile.statusCode as ProcurementStatusCode] ??
        profile.statusCode
      : null,
    qualificationStatusCode: qualification,
    qualificationLabel: qualification
      ? QUALIFICATION_STATUS_LABELS[qualification]
      : null,
    isPreferred,
    restrictions: [],
    reasons,
    actionRequired,
  };
}
