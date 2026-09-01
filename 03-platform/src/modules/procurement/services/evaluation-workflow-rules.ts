/**
 * Purpose:
 * Pure evaluation workflow rules — tender close, committee, criteria, due diligence.
 */

import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import { SOURCING_EVENT_STATUSES } from "@/modules/procurement/constants";

export const EVALUATION_STAGES = {
  BIDDING: "BIDDING",
  BIDS_RECEIVED: "BIDS_RECEIVED",
  COMMITTEE_SET: "COMMITTEE_SET",
  CRITERIA_SET: "CRITERIA_SET",
  CRITERIA_LOCKED: "CRITERIA_LOCKED",
  IN_PROGRESS: "IN_PROGRESS",
} as const;

export type EvaluationStage = (typeof EVALUATION_STAGES)[keyof typeof EVALUATION_STAGES];

export const EVALUATION_STAGE_LABELS: Record<EvaluationStage, string> = {
  BIDDING: "Bidding open",
  BIDS_RECEIVED: "Bids received — set up committee",
  COMMITTEE_SET: "Committee set — configure criteria",
  CRITERIA_SET: "Criteria configured — lock before opening bids",
  CRITERIA_LOCKED: "Criteria locked — ready to open bids",
  IN_PROGRESS: "Evaluation in progress",
};

export type CommitteeMemberInput = {
  memberName: string;
  roleLabel?: string | null;
  userId?: string | null;
};

export type DueDiligenceInput = {
  required: boolean;
  locationVerified?: boolean;
  staffVerified?: boolean;
  legalVerified?: boolean;
  otherNotes?: string | null;
};

export function isCommercialSealedToBuyer(
  eventStatus: string,
  bidsOpenedAt?: Date | string | null
): boolean {
  if (eventStatus === SOURCING_EVENT_STATUSES.AWARDED) {
    return false;
  }
  if (eventStatus === SOURCING_EVENT_STATUSES.EVALUATING && bidsOpenedAt) {
    return false;
  }
  return true;
}

export function validateCommitteeMembers(members: CommitteeMemberInput[]): CommitteeMemberInput[] {
  const normalized = members
    .map((member, index) => {
      const memberName = member.memberName?.trim() ?? "";
      if (!memberName) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
          field: `members.${index}.memberName`,
        });
      }
      return {
        memberName,
        roleLabel: member.roleLabel?.trim() || null,
        userId: member.userId?.trim() || null,
      };
    })
    .filter((row) => row.memberName.length > 0);
  if (normalized.length === 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "members",
    });
  }
  return normalized;
}

export function isDueDiligenceComplete(input: {
  required: boolean | null;
  locationVerified: boolean;
  staffVerified: boolean;
  legalVerified: boolean;
  recordedAt: Date | string | null;
}): boolean {
  if (!input.recordedAt) {
    return false;
  }
  if (!input.required) {
    return true;
  }
  return input.locationVerified && input.staffVerified && input.legalVerified;
}

export function validateDueDiligence(input: DueDiligenceInput): DueDiligenceInput {
  if (!input.required) {
    return {
      required: false,
      locationVerified: false,
      staffVerified: false,
      legalVerified: false,
      otherNotes: null,
    };
  }
  if (!input.locationVerified || !input.staffVerified || !input.legalVerified) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.DUE_DILIGENCE_INCOMPLETE, undefined, 409);
  }
  return {
    required: true,
    locationVerified: true,
    staffVerified: true,
    legalVerified: true,
    otherNotes: input.otherNotes?.trim() || null,
  };
}

export function assertEvaluationStage(
  current: string,
  expected: EvaluationStage | EvaluationStage[]
) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (!allowed.includes(current as EvaluationStage)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
  }
}
