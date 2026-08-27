/**
 * Purpose:
 * Pure commercial governance rules — lifecycle, materiality, SoD, thresholds.
 * Does not calculate price/tax/discount (IP-01…IP-07 ownership).
 *
 * Implementation Package:
 * BP-005 / IP-08 – Commercial Governance
 */

import {
  COMMERCIAL_GOVERNANCE_DECISION_CODES,
  COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES,
  COMMERCIAL_GOVERNANCE_PERMISSIONS,
  COMMERCIAL_GOVERNANCE_TRANSITIONS,
  DEFAULT_MATERIAL_FIELD_PATHS,
  DEFAULT_NON_MATERIAL_FIELD_PATHS,
  type CommercialGovernanceLifecycleCode,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
} from "@/modules/commercial/money/commercial-money";
import type {
  CommercialGovernanceActor,
  CommercialGovernanceDecision,
  CommercialGovernancePolicyView,
  CommercialRuleVersionView,
} from "@/modules/commercial/types";

export function assertBusinessScope(
  contextBusinessId: string,
  targetBusinessId: string
): void {
  if (!contextBusinessId || contextBusinessId !== targetBusinessId) {
    throw new CommercialError(
      "INVALID_CONTEXT",
      COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
      403,
      "businessId"
    );
  }
}

export function assertPermission(
  actor: CommercialGovernanceActor,
  permission: string
): void {
  if (!actor.userId?.trim()) {
    throw new CommercialError(
      "GOVERNANCE_UNAUTHORIZED",
      COMMERCIAL_USER_MESSAGES.GOVERNANCE_UNAUTHORIZED,
      403
    );
  }
  if (!actor.permissions.includes(permission)) {
    throw new CommercialError(
      "GOVERNANCE_UNAUTHORIZED",
      COMMERCIAL_USER_MESSAGES.GOVERNANCE_UNAUTHORIZED,
      403,
      undefined,
      { requiredPermission: permission }
    );
  }
}

export function canTransitionLifecycle(
  from: CommercialGovernanceLifecycleCode,
  to: CommercialGovernanceLifecycleCode,
  options: { approvalRequired: boolean }
): boolean {
  const allowed = COMMERCIAL_GOVERNANCE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return false;
  }
  // DRAFT → ACTIVE is never in the map; APPROVED → ACTIVE requires prior approval path.
  if (
    from === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.DRAFT &&
    to === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE &&
    options.approvalRequired
  ) {
    return false;
  }
  if (
    from === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.REJECTED &&
    to === COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE
  ) {
    return false;
  }
  return true;
}

export function assertLifecycleTransition(
  from: CommercialGovernanceLifecycleCode,
  to: CommercialGovernanceLifecycleCode,
  options: { approvalRequired: boolean }
): void {
  if (!canTransitionLifecycle(from, to, options)) {
    throw new CommercialError(
      "INVALID_LIFECYCLE_TRANSITION",
      COMMERCIAL_USER_MESSAGES.INVALID_LIFECYCLE_TRANSITION,
      409,
      undefined,
      { from, to, approvalRequired: options.approvalRequired }
    );
  }
}

function getPathValue(source: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = source;
  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "__undefined__";
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  return JSON.stringify(value);
}

export type MaterialChangeResult = {
  isMaterial: boolean;
  changedMaterialPaths: string[];
  changedNonMaterialPaths: string[];
};

export function detectMaterialChange(
  before: {
    label: string;
    description: string | null;
    payload: Record<string, unknown>;
    currencyCode: string | null;
    effectiveFrom: string | null;
    effectiveTo: string | null;
    metadata?: Record<string, unknown> | null;
  },
  after: {
    label?: string;
    description?: string | null;
    payload?: Record<string, unknown>;
    currencyCode?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    metadata?: Record<string, unknown> | null;
  },
  materialFieldPaths: string[] = [...DEFAULT_MATERIAL_FIELD_PATHS]
): MaterialChangeResult {
  const beforeBag = {
    label: before.label,
    description: before.description,
    payload: before.payload,
    currencyCode: before.currencyCode,
    effectiveFrom: before.effectiveFrom,
    effectiveTo: before.effectiveTo,
    metadata: before.metadata ?? null,
  };
  const afterBag = {
    label: after.label ?? before.label,
    description:
      after.description === undefined ? before.description : after.description,
    payload: after.payload ?? before.payload,
    currencyCode:
      after.currencyCode === undefined
        ? before.currencyCode
        : after.currencyCode,
    effectiveFrom:
      after.effectiveFrom === undefined
        ? before.effectiveFrom
        : after.effectiveFrom,
    effectiveTo:
      after.effectiveTo === undefined ? before.effectiveTo : after.effectiveTo,
    metadata:
      after.metadata === undefined ? before.metadata ?? null : after.metadata,
  };

  const changedMaterialPaths: string[] = [];
  const changedNonMaterialPaths: string[] = [];

  for (const path of materialFieldPaths) {
    const b = getPathValue(beforeBag as Record<string, unknown>, path);
    const a = getPathValue(afterBag as Record<string, unknown>, path);
    if (stableSerialize(b) !== stableSerialize(a)) {
      changedMaterialPaths.push(path);
    }
  }

  for (const path of DEFAULT_NON_MATERIAL_FIELD_PATHS) {
    const b = getPathValue(beforeBag as Record<string, unknown>, path);
    const a = getPathValue(afterBag as Record<string, unknown>, path);
    if (stableSerialize(b) !== stableSerialize(a)) {
      changedNonMaterialPaths.push(path);
    }
  }

  return {
    isMaterial: changedMaterialPaths.length > 0,
    changedMaterialPaths,
    changedNonMaterialPaths,
  };
}

export function assertSegregationOfDuties(
  policy: CommercialGovernancePolicyView,
  makerUserId: string | null,
  checkerUserId: string
): void {
  if (!policy.requiresSegregationOfDuties) {
    return;
  }
  if (makerUserId && makerUserId === checkerUserId) {
    throw new CommercialError(
      "GOVERNANCE_SOD_VIOLATION",
      COMMERCIAL_USER_MESSAGES.GOVERNANCE_SOD_VIOLATION,
      403
    );
  }
}

/**
 * Threshold evaluation using scaled money — never IEEE float comparison.
 * Returns true when change magnitude exceeds configured threshold (enhanced approval).
 */
export function exceedsApprovalThreshold(
  policy: CommercialGovernancePolicyView,
  changeAmount: string | number | null | undefined,
  currencyCode: string | null | undefined
): boolean {
  if (
    policy.approvalThresholdAmount == null ||
    !String(policy.approvalThresholdAmount).trim()
  ) {
    return false;
  }
  if (changeAmount == null || changeAmount === "") {
    return false;
  }
  const thresholdCurrency = (
    policy.approvalThresholdCurrency ??
    currencyCode ??
    "XXX"
  )
    .trim()
    .toUpperCase();
  const amountCurrency = (currencyCode ?? thresholdCurrency)
    .trim()
    .toUpperCase();
  if (thresholdCurrency !== amountCurrency) {
    throw new CommercialError(
      "CURRENCY_MISMATCH",
      COMMERCIAL_USER_MESSAGES.CURRENCY_MISMATCH,
      409,
      "currencyCode",
      { thresholdCurrency, amountCurrency }
    );
  }
  const threshold = parseMoneyToScaled(
    policy.approvalThresholdAmount,
    thresholdCurrency,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );
  const amount = parseMoneyToScaled(
    changeAmount,
    amountCurrency,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );
  const absUnits = amount.units < BigInt(0) ? -amount.units : amount.units;
  return absUnits > threshold.units;
}

export function isCommerciallyEffectiveAt(
  rule: Pick<
    CommercialRuleVersionView,
    "lifecycleStatus" | "effectiveFrom" | "effectiveTo"
  >,
  asAt: Date = new Date()
): boolean {
  if (rule.lifecycleStatus !== COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE) {
    return false;
  }
  const t = asAt.getTime();
  if (rule.effectiveFrom) {
    const from = Date.parse(rule.effectiveFrom);
    if (!Number.isNaN(from) && t < from) {
      return false;
    }
  }
  if (rule.effectiveTo) {
    const to = Date.parse(rule.effectiveTo);
    if (!Number.isNaN(to) && t > to) {
      return false;
    }
  }
  return true;
}

export function buildGovernanceDecision(input: {
  decision: CommercialGovernanceDecision["decision"];
  reason: string;
  governanceRule: string;
  businessId: string;
  actorUserId: string;
  approvalReference?: string | null;
  ruleVersionId?: string | null;
  details?: Record<string, unknown>;
}): CommercialGovernanceDecision {
  return {
    decision: input.decision,
    reason: input.reason,
    governanceRule: input.governanceRule,
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    approvalReference: input.approvalReference ?? null,
    ruleVersionId: input.ruleVersionId ?? null,
    timestamp: new Date().toISOString(),
    details: input.details,
  };
}

export function evaluateActivationDecision(input: {
  policy: CommercialGovernancePolicyView;
  rule: CommercialRuleVersionView;
  actor: CommercialGovernanceActor;
  asAt?: Date;
}): CommercialGovernanceDecision {
  const asAt = input.asAt ?? new Date();
  if (
    input.rule.lifecycleStatus !==
      COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.APPROVED &&
    input.rule.lifecycleStatus !== COMMERCIAL_GOVERNANCE_LIFECYCLE_CODES.ACTIVE
  ) {
    return buildGovernanceDecision({
      decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.REJECTED,
      reason: "Configuration is not in APPROVED state.",
      governanceRule: "LIFECYCLE_GATE",
      businessId: input.rule.businessId,
      actorUserId: input.actor.userId,
      ruleVersionId: input.rule.ruleVersionId,
    });
  }
  if (input.rule.effectiveFrom) {
    const from = Date.parse(input.rule.effectiveFrom);
    if (!Number.isNaN(from) && asAt.getTime() < from) {
      return buildGovernanceDecision({
        decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.REVIEW_REQUIRED,
        reason:
          "Effective date has not been reached — approved but not yet commercially effective.",
        governanceRule: "EFFECTIVE_DATE_GATE",
        businessId: input.rule.businessId,
        actorUserId: input.actor.userId,
        ruleVersionId: input.rule.ruleVersionId,
        details: { effectiveFrom: input.rule.effectiveFrom },
      });
    }
  }
  if (!input.actor.permissions.includes(COMMERCIAL_GOVERNANCE_PERMISSIONS.ACTIVATE)) {
    return buildGovernanceDecision({
      decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.REJECTED,
      reason: "Actor lacks activation authority.",
      governanceRule: "AUTHORIZATION_GATE",
      businessId: input.rule.businessId,
      actorUserId: input.actor.userId,
      ruleVersionId: input.rule.ruleVersionId,
    });
  }
  return buildGovernanceDecision({
    decision: COMMERCIAL_GOVERNANCE_DECISION_CODES.ALLOWED,
    reason: "Activation is permitted under governance policy.",
    governanceRule: "ACTIVATION_ALLOWED",
    businessId: input.rule.businessId,
    actorUserId: input.actor.userId,
    ruleVersionId: input.rule.ruleVersionId,
  });
}

export function defaultGovernancePolicy(
  businessId: string,
  policyId = "policy-default"
): CommercialGovernancePolicyView {
  return {
    policyId,
    businessId,
    approvalRequired: true,
    requiresSegregationOfDuties: true,
    requiredApproverCount: 1,
    approvalThresholdAmount: null,
    approvalThresholdCurrency: null,
    allowOverride: false,
    overrideRequiresApproval: true,
    mandatoryJustification: true,
    materialFieldPaths: [...DEFAULT_MATERIAL_FIELD_PATHS],
    isActive: true,
  };
}
