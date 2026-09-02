/**
 * Purpose:
 * Immutable evaluation criteria snapshot for post-lock evaluation integrity.
 */

import { createHash } from "node:crypto";

export type CriteriaPhaseSnapshot = {
  phaseCode: string;
  included: boolean;
  sequence: number;
  weight: string;
  passmark: string;
  required: boolean;
};

export type CriteriaSnapshot = {
  evaluationMethod: string;
  technicalWeight: string;
  financialWeight: string;
  financialBasis: string;
  phases: CriteriaPhaseSnapshot[];
};

export function buildCriteriaSnapshot(input: CriteriaSnapshot): CriteriaSnapshot {
  return {
    evaluationMethod: input.evaluationMethod.trim().toUpperCase(),
    technicalWeight: input.technicalWeight,
    financialWeight: input.financialWeight,
    financialBasis: input.financialBasis.trim().toUpperCase(),
    phases: [...input.phases]
      .sort((a, b) => a.sequence - b.sequence)
      .map((phase) => ({
        phaseCode: phase.phaseCode,
        included: phase.included,
        sequence: phase.sequence,
        weight: phase.weight,
        passmark: phase.passmark,
        required: phase.required,
      })),
  };
}

export function hashCriteriaSnapshot(snapshot: CriteriaSnapshot): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function parseCriteriaSnapshot(json: string | null | undefined): CriteriaSnapshot | null {
  if (!json?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(json) as CriteriaSnapshot;
    if (!parsed?.evaluationMethod || !Array.isArray(parsed.phases)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
