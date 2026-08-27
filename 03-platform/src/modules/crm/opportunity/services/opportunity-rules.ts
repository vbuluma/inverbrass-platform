/**
 * Purpose:
 * Opportunity pipeline and stage business rules.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import {
  OPPORTUNITY_CLOSED_STATUS_CODES,
  OPPORTUNITY_STATUS_CODES,
  type OpportunityStatusCode,
} from "@/modules/crm/opportunity/constants";

export type PipelineStageDefinition = {
  code: string;
  displayOrder: number;
  defaultProbability: number;
  isClosedWon: boolean;
  isClosedLost: boolean;
};

export function formatOpportunityNumber(sequence: number): string {
  return `OPP-${String(sequence).padStart(6, "0")}`;
}

export function isOpportunityStatusCode(
  value: string
): value is OpportunityStatusCode {
  return Object.values(OPPORTUNITY_STATUS_CODES).includes(
    value as OpportunityStatusCode
  );
}

export function isOpportunityEditable(statusCode: string): boolean {
  return !OPPORTUNITY_CLOSED_STATUS_CODES.includes(
    statusCode as OpportunityStatusCode
  );
}

export function canTransitionStage(
  stages: PipelineStageDefinition[],
  fromStageCode: string,
  toStageCode: string
): boolean {
  const ordered = [...stages].sort((a, b) => a.displayOrder - b.displayOrder);
  const fromIndex = ordered.findIndex((stage) => stage.code === fromStageCode);
  const toIndex = ordered.findIndex((stage) => stage.code === toStageCode);

  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }

  const fromStage = ordered[fromIndex]!;
  const toStage = ordered[toIndex]!;

  if (fromStage.isClosedWon || fromStage.isClosedLost) {
    return false;
  }

  if (toStage.isClosedWon || toStage.isClosedLost) {
    return true;
  }

  return toIndex >= fromIndex;
}

export function resolveStatusForStage(stage: PipelineStageDefinition): OpportunityStatusCode {
  if (stage.isClosedWon) {
    return OPPORTUNITY_STATUS_CODES.WON;
  }
  if (stage.isClosedLost) {
    return OPPORTUNITY_STATUS_CODES.LOST;
  }
  return OPPORTUNITY_STATUS_CODES.OPEN;
}

export function calculateWeightedAmount(
  amount: string | null | undefined,
  probability: number
): string | null {
  if (!amount) {
    return null;
  }

  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount)) {
    return null;
  }

  return ((numericAmount * probability) / 100).toFixed(2);
}
