/**
 * Purpose:
 * Pure BP-009 IP-11 supplier performance and governance rules.
 */

import {
  GOVERNANCE_PROPOSAL_TYPES,
  PERFORMANCE_MEASURE_CODES,
  PROCUREMENT_STATUS_CODES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { PerformanceMeasureRecord } from "@/modules/procurement/types";

export function assertGovernanceEvidence(input: {
  proposalType: string;
  reason?: string | null;
  authority?: string | null;
  evidenceDocumentId?: string | null;
}) {
  if (!input.reason?.trim()) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.STATUS_REASON_REQUIRED, undefined, 400, {
      field: "reason",
    });
  }
  const requiresEvidence =
    input.proposalType === GOVERNANCE_PROPOSAL_TYPES.BLACKLIST ||
    input.proposalType === GOVERNANCE_PROPOSAL_TYPES.SUSPEND;
  if (requiresEvidence) {
    if (!input.authority?.trim()) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_EVIDENCE_REQUIRED, undefined, 400, {
        field: "authority",
      });
    }
    if (!input.evidenceDocumentId?.trim()) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_EVIDENCE_REQUIRED, undefined, 400, {
        field: "evidenceDocumentId",
      });
    }
  }
}

export function governanceTargetStatus(proposalType: string) {
  switch (proposalType) {
    case GOVERNANCE_PROPOSAL_TYPES.BLACKLIST:
      return PROCUREMENT_STATUS_CODES.BLACKLISTED;
    case GOVERNANCE_PROPOSAL_TYPES.SUSPEND:
      return PROCUREMENT_STATUS_CODES.SUSPENDED;
    case GOVERNANCE_PROPOSAL_TYPES.REACTIVATE:
      return PROCUREMENT_STATUS_CODES.ACTIVE;
    default:
      return null;
  }
}

export function computeMeasureScore(input: {
  measure: PerformanceMeasureRecord;
  eventCount: number;
  pairedOnTime?: number;
  pairedLate?: number;
}) {
  const pairedMeasures = new Set([
    PERFORMANCE_MEASURE_CODES.DELIVERY_ON_TIME,
    PERFORMANCE_MEASURE_CODES.DELIVERY_LATE,
  ]);
  if (pairedMeasures.has(input.measure.code as typeof PERFORMANCE_MEASURE_CODES.DELIVERY_ON_TIME)) {
    const onTime = input.pairedOnTime ?? 0;
    const late = input.pairedLate ?? 0;
    const total = onTime + late;
    if (total === 0) {
      return 100;
    }
    if (input.measure.code === PERFORMANCE_MEASURE_CODES.DELIVERY_ON_TIME) {
      return Number(((onTime / total) * 100).toFixed(2));
    }
    return Number(((late / total) * 100).toFixed(2));
  }
  if (input.eventCount === 0) {
    return 100;
  }
  if (input.measure.higherIsBetter) {
    return Math.min(100, Number((input.eventCount * 10).toFixed(2)));
  }
  return Math.max(0, Number((100 - input.eventCount * 10).toFixed(2)));
}

export function computeCompositeScore(
  rows: Array<{ score: number; weight: number }>
): string {
  if (rows.length === 0) {
    return "0";
  }
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
  if (totalWeight <= 0) {
    return "0";
  }
  const weighted = rows.reduce((sum, row) => sum + row.score * row.weight, 0);
  return (weighted / totalWeight).toFixed(2);
}

export function compareInvitationRank(
  left: { compositeScore: string | null; isPreferred: boolean },
  right: { compositeScore: string | null; isPreferred: boolean }
) {
  if (left.isPreferred !== right.isPreferred) {
    return left.isPreferred ? -1 : 1;
  }
  const leftScore = Number(left.compositeScore ?? "0");
  const rightScore = Number(right.compositeScore ?? "0");
  return rightScore - leftScore;
}

export function preferredThresholdMet(compositeScore: string, threshold: string) {
  return Number(compositeScore) >= Number(threshold);
}
