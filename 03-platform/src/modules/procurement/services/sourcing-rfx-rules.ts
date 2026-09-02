/**
 * Purpose:
 * Pure IP-03 RFX control rules — duration, opening policy, evaluation lock.
 * Does not score suppliers or write quotes.
 */

import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";

export const EVALUATION_METHODS = {
  LOWEST_COMPLIANT: "LOWEST_COMPLIANT",
  BEST_OVERALL: "BEST_OVERALL",
  MANUAL: "MANUAL",
} as const;

export type EvaluationMethod = (typeof EVALUATION_METHODS)[keyof typeof EVALUATION_METHODS];

export const FINANCIAL_BASES = {
  YEAR_1: "YEAR_1",
  TCV: "TCV",
  TCO: "TCO",
} as const;

export type FinancialBasis = (typeof FINANCIAL_BASES)[keyof typeof FINANCIAL_BASES];

export const OPENING_POLICIES = {
  STANDARD: "STANDARD",
  MAKER_CHECKER: "MAKER_CHECKER",
} as const;

export type OpeningPolicy = (typeof OPENING_POLICIES)[keyof typeof OPENING_POLICIES];

export const OPENING_POLICY_SOURCES = {
  ORGANISATION_DEFAULT: "ORGANISATION_DEFAULT",
  ENFORCEMENT_RULE: "ENFORCEMENT_RULE",
  RFX_REQUEST: "RFX_REQUEST",
} as const;

export type OpeningPolicySource =
  (typeof OPENING_POLICY_SOURCES)[keyof typeof OPENING_POLICY_SOURCES];

export const RISK_LEVELS = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

export const TECHNICAL_PHASE_CODES = {
  DESKTOP: "DESKTOP",
  DEMO: "DEMO",
  POC: "POC",
  REFERENCE: "REFERENCE",
  SITE_VISIT: "SITE_VISIT",
} as const;

export type TechnicalPhaseCode =
  (typeof TECHNICAL_PHASE_CODES)[keyof typeof TECHNICAL_PHASE_CODES];

export const OPENING_RULE_DIMENSIONS = {
  VALUE: "VALUE",
  CATEGORY: "CATEGORY",
  TYPE: "TYPE",
  RISK: "RISK",
} as const;

export const TECHNICAL_PHASE_LABELS: Record<TechnicalPhaseCode, string> = {
  DESKTOP: "Desktop",
  DEMO: "Demo",
  POC: "Proof of concept",
  REFERENCE: "Reference call",
  SITE_VISIT: "Site visit",
};

export const EVALUATION_METHOD_LABELS: Record<EvaluationMethod, string> = {
  LOWEST_COMPLIANT: "Lowest compliant quote",
  BEST_OVERALL: "Best overall score",
  MANUAL: "Manual evaluation",
};

export const OPENING_POLICY_LABELS: Record<OpeningPolicy, string> = {
  STANDARD: "Standard opening",
  MAKER_CHECKER: "Maker-checker opening",
};

export type EvaluationPhaseInput = {
  phaseCode: string;
  included: boolean;
  sequence: number;
  weight: string;
  passmark: string;
  required: boolean;
};

export type SourcingControlSnapshot = {
  defaultOpeningPolicy: OpeningPolicy;
  extensionRequiresApproval: boolean;
  makerCheckerMinAmount: string | null;
};

export type OpeningRuleSnapshot = {
  dimension: string;
  matchValue: string;
  requiredPolicy: OpeningPolicy;
};

export function parseIsoDate(value: string | Date | null | undefined, field: string): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
  }
  return parsed;
}

export function isBiddingOpen(input: {
  status: string;
  closesAt: Date | string | null;
  now?: Date;
}): boolean {
  if (input.status === "AWARDED") {
    return false;
  }
  if (!input.closesAt) {
    return input.status === "ISSUED";
  }
  const closesAt = input.closesAt instanceof Date ? input.closesAt : new Date(input.closesAt);
  return input.status === "ISSUED" && (input.now ?? new Date()).getTime() < closesAt.getTime();
}

export function defaultEvaluationPhases(): EvaluationPhaseInput[] {
  return [
    { phaseCode: TECHNICAL_PHASE_CODES.DESKTOP, included: true, sequence: 1, weight: "100", passmark: "0", required: true },
    { phaseCode: TECHNICAL_PHASE_CODES.DEMO, included: false, sequence: 2, weight: "0", passmark: "0", required: false },
    { phaseCode: TECHNICAL_PHASE_CODES.POC, included: false, sequence: 3, weight: "0", passmark: "0", required: false },
    { phaseCode: TECHNICAL_PHASE_CODES.REFERENCE, included: false, sequence: 4, weight: "0", passmark: "0", required: false },
    { phaseCode: TECHNICAL_PHASE_CODES.SITE_VISIT, included: false, sequence: 5, weight: "0", passmark: "0", required: false },
  ];
}

function parseWeight(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
  }
  return parsed;
}

export function validateEvaluationConfig(input: {
  evaluationMethod: string;
  technicalWeight: string;
  financialWeight: string;
  financialBasis: string;
  phases: EvaluationPhaseInput[];
}): {
  evaluationMethod: EvaluationMethod;
  technicalWeight: string;
  financialWeight: string;
  financialBasis: FinancialBasis;
  phases: EvaluationPhaseInput[];
} {
  const method = input.evaluationMethod.trim().toUpperCase();
  if (!Object.values(EVALUATION_METHODS).includes(method as EvaluationMethod)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "evaluationMethod",
    });
  }
  const basis = input.financialBasis.trim().toUpperCase();
  if (!Object.values(FINANCIAL_BASES).includes(basis as FinancialBasis)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "financialBasis",
    });
  }
  const known = new Set(Object.values(TECHNICAL_PHASE_CODES));
  const phases = input.phases.map((phase, index) => {
    const phaseCode = phase.phaseCode.trim().toUpperCase();
    if (!known.has(phaseCode as TechnicalPhaseCode)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `phases.${index}.phaseCode`,
      });
    }
    parseWeight(phase.weight, `phases.${index}.weight`);
    parseWeight(phase.passmark, `phases.${index}.passmark`);
    return {
      phaseCode,
      included: Boolean(phase.included),
      sequence: phase.sequence || index + 1,
      weight: phase.weight,
      passmark: phase.passmark,
      required: Boolean(phase.required),
    };
  });
  const included = phases.filter((row) => row.included);
  if (method !== EVALUATION_METHODS.MANUAL && included.length === 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "phases",
    });
  }
  const technicalWeight = parseWeight(input.technicalWeight, "technicalWeight");
  const financialWeight = parseWeight(input.financialWeight, "financialWeight");
  if (method === EVALUATION_METHODS.BEST_OVERALL && technicalWeight + financialWeight !== 100) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "technicalWeight",
    });
  }
  return {
    evaluationMethod: method as EvaluationMethod,
    technicalWeight: String(technicalWeight),
    financialWeight: String(financialWeight),
    financialBasis: basis as FinancialBasis,
    phases,
  };
}

export function resolveOpeningPolicy(input: {
  requestedPolicy?: string | null;
  budgetAmount: string;
  rfxType: string;
  categoryCode?: string | null;
  riskLevel: string;
  control: SourcingControlSnapshot;
  rules: OpeningRuleSnapshot[];
}): { policy: OpeningPolicy; source: OpeningPolicySource } {
  const requested = (input.requestedPolicy ?? "ORGANISATION_DEFAULT").trim().toUpperCase();
  const budget = Number(input.budgetAmount);
  const matchedRule = input.rules.some((rule) => {
    if (rule.requiredPolicy !== OPENING_POLICIES.MAKER_CHECKER) {
      return false;
    }
    if (rule.dimension === OPENING_RULE_DIMENSIONS.VALUE) {
      return Number.isFinite(budget) && budget >= Number(rule.matchValue);
    }
    if (rule.dimension === OPENING_RULE_DIMENSIONS.TYPE) {
      return rule.matchValue.toUpperCase() === input.rfxType.toUpperCase();
    }
    if (rule.dimension === OPENING_RULE_DIMENSIONS.CATEGORY) {
      return Boolean(input.categoryCode) && rule.matchValue.toUpperCase() === input.categoryCode!.toUpperCase();
    }
    if (rule.dimension === OPENING_RULE_DIMENSIONS.RISK) {
      return rule.matchValue.toUpperCase() === input.riskLevel.toUpperCase();
    }
    return false;
  });
  const valueThreshold = input.control.makerCheckerMinAmount
    ? Number.isFinite(budget) && budget >= Number(input.control.makerCheckerMinAmount)
    : false;
  if (matchedRule || valueThreshold) {
    return {
      policy: OPENING_POLICIES.MAKER_CHECKER,
      source: OPENING_POLICY_SOURCES.ENFORCEMENT_RULE,
    };
  }
  if (requested === OPENING_POLICIES.MAKER_CHECKER) {
    return {
      policy: OPENING_POLICIES.MAKER_CHECKER,
      source: OPENING_POLICY_SOURCES.RFX_REQUEST,
    };
  }
  if (requested === OPENING_POLICIES.STANDARD) {
    return {
      policy: OPENING_POLICIES.STANDARD,
      source: OPENING_POLICY_SOURCES.RFX_REQUEST,
    };
  }
  return {
    policy: input.control.defaultOpeningPolicy,
    source: OPENING_POLICY_SOURCES.ORGANISATION_DEFAULT,
  };
}

export function assertExtensionClock(input: {
  currentClosesAt: Date;
  nextClosesAt: Date;
  now?: Date;
  awarded: boolean;
}) {
  if (input.awarded) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXTENSION_INVALID, undefined, 409);
  }
  const now = input.now ?? new Date();
  if (input.nextClosesAt.getTime() <= now.getTime() || input.nextClosesAt.getTime() <= input.currentClosesAt.getTime()) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXTENSION_INVALID, undefined, 400, {
      field: "closesAt",
    });
  }
}
