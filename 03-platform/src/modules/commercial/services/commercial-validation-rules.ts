/**
 * Purpose:
 * Pure commercial validation & resilience rules (IP-09).
 * Fail closed — never invent silent fallback payables.
 *
 * Implementation Package:
 * BP-005 / IP-09 – Commercial Validation & Resilience
 */

import {
  COMMERCIAL_ERROR_FAMILIES,
  COMMERCIAL_VALIDATION_STAGES,
  DEFAULT_COMMERCIAL_REQUIRED_CONFIG,
  type CommercialValidationStage,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_ERROR_ACTIONABLE_HINTS,
  COMMERCIAL_ERROR_CODE_FAMILY,
  COMMERCIAL_USER_MESSAGES,
  type CommercialErrorCode,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
  scaledToString,
  zeroScaled,
} from "@/modules/commercial/money/commercial-money";
import { detectCircularDependencies } from "@/modules/commercial/services/commercial-component-rules";
import type {
  CommercialPreValidationInput,
  CommercialRequiredConfigPolicy,
  CommercialResolution,
  CommercialValidationIssue,
  CommercialValidationReport,
  CreateCommercialRuleDraftInput,
  StructuredCommercialErrorPayload,
} from "@/modules/commercial/types";

export function resolveRequiredConfigPolicy(
  input?: Partial<CommercialRequiredConfigPolicy> | null
): CommercialRequiredConfigPolicy {
  return {
    requireBasePrice:
      input?.requireBasePrice ??
      DEFAULT_COMMERCIAL_REQUIRED_CONFIG.requireBasePrice,
    requireTaxConfiguration:
      input?.requireTaxConfiguration ??
      DEFAULT_COMMERCIAL_REQUIRED_CONFIG.requireTaxConfiguration,
    requireAdjustmentConfiguration:
      input?.requireAdjustmentConfiguration ??
      DEFAULT_COMMERCIAL_REQUIRED_CONFIG.requireAdjustmentConfiguration,
    allowMixedCurrency:
      input?.allowMixedCurrency ??
      DEFAULT_COMMERCIAL_REQUIRED_CONFIG.allowMixedCurrency,
    allowNegativePayable:
      input?.allowNegativePayable ??
      DEFAULT_COMMERCIAL_REQUIRED_CONFIG.allowNegativePayable,
    allowSilentZeroFallback:
      input?.allowSilentZeroFallback ??
      DEFAULT_COMMERCIAL_REQUIRED_CONFIG.allowSilentZeroFallback,
  };
}

export function buildValidationIssue(
  code: CommercialErrorCode,
  stage: CommercialValidationStage | string,
  overrides?: Partial<CommercialValidationIssue>
): CommercialValidationIssue {
  return {
    code,
    family: COMMERCIAL_ERROR_CODE_FAMILY[code] ?? COMMERCIAL_ERROR_FAMILIES.VALIDATION,
    message: overrides?.message ?? COMMERCIAL_USER_MESSAGES[code],
    field: overrides?.field ?? null,
    ruleId: overrides?.ruleId ?? null,
    stage,
    actionableHint:
      overrides?.actionableHint ??
      COMMERCIAL_ERROR_ACTIONABLE_HINTS[code] ??
      "Correct the commercial configuration and re-resolve. No payable was produced.",
    details: overrides?.details ?? null,
  };
}

export function toStructuredCommercialError(
  error: CommercialError,
  context?: {
    stage?: CommercialValidationStage | string;
    businessId?: string | null;
    offeringId?: string | null;
    currencyCode?: string | null;
    ruleId?: string | null;
  }
): StructuredCommercialErrorPayload {
  const code = error.code;
  return {
    code,
    family: COMMERCIAL_ERROR_CODE_FAMILY[code] ?? COMMERCIAL_ERROR_FAMILIES.VALIDATION,
    message: error.message,
    field: error.field ?? null,
    ruleId:
      context?.ruleId ??
      (typeof error.details?.ruleId === "string" ? error.details.ruleId : null),
    businessId: context?.businessId ?? null,
    offeringId: context?.offeringId ?? null,
    currencyCode: context?.currencyCode ?? null,
    details: error.details ?? null,
    actionableHint:
      COMMERCIAL_ERROR_ACTIONABLE_HINTS[code] ??
      "Correct the commercial configuration and re-resolve. No payable was produced.",
    stage: context?.stage ?? COMMERCIAL_VALIDATION_STAGES.PRE_REQUEST,
    ip: "IP-09",
    retryable: false,
    payableProduced: false,
  };
}

export function throwFromValidationReport(
  report: CommercialValidationReport
): never {
  const primary = report.issues[0];
  if (!primary) {
    throw new CommercialError(
      "COMMERCIAL_VALIDATION_FAILED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_VALIDATION_FAILED,
      400
    );
  }
  const code = (primary.code as CommercialErrorCode) in COMMERCIAL_USER_MESSAGES
    ? (primary.code as CommercialErrorCode)
    : "COMMERCIAL_VALIDATION_FAILED";
  throw new CommercialError(
    code,
    primary.message,
    400,
    primary.field ?? undefined,
    {
      family: primary.family,
      stage: report.stage,
      issues: report.issues,
      actionableHint: primary.actionableHint,
      ...(primary.details ?? {}),
    }
  );
}

/**
 * Pre-validate request shape, auth scope hints, and required configuration presence.
 * Does not invent prices or tax rates.
 */
export function validateResolutionRequestPre(
  input: CommercialPreValidationInput,
  contextBusinessId: string
): CommercialValidationReport {
  const stage = COMMERCIAL_VALIDATION_STAGES.PRE_REQUEST;
  const issues: CommercialValidationIssue[] = [];
  const policy = resolveRequiredConfigPolicy({
    ...input.policy,
    requireTaxConfiguration:
      input.requireTaxConfiguration ?? input.policy?.requireTaxConfiguration,
    requireAdjustmentConfiguration:
      input.requireAdjustmentConfiguration ??
      input.policy?.requireAdjustmentConfiguration,
    allowNegativePayable:
      input.allowNegativePayable ?? input.policy?.allowNegativePayable,
  });

  if (!input.businessId?.trim()) {
    issues.push(
      buildValidationIssue("INVALID_CONTEXT", stage, { field: "businessId" })
    );
  } else if (input.businessId !== contextBusinessId) {
    issues.push(
      buildValidationIssue("BUSINESS_CONTEXT_MISMATCH", stage, {
        field: "businessId",
        details: {
          requestBusinessId: input.businessId,
          contextBusinessId,
        },
      })
    );
  }

  if (!input.offeringId?.trim()) {
    issues.push(
      buildValidationIssue("INVALID_CONTEXT", stage, { field: "offeringId" })
    );
  }

  if (!input.currencyCode?.trim()) {
    issues.push(
      buildValidationIssue("INVALID_CURRENCY", stage, { field: "currencyCode" })
    );
  }

  if (
    input.quantity != null &&
    (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) <= 0)
  ) {
    issues.push(
      buildValidationIssue("INVALID_INPUT", stage, {
        field: "quantity",
        message: "Quantity must be a positive number.",
      })
    );
  }

  if (policy.allowSilentZeroFallback) {
    issues.push(
      buildValidationIssue("SILENT_FALLBACK_FORBIDDEN", stage, {
        message:
          "allowSilentZeroFallback is forbidden under IP-09 resilience rules.",
        details: { policy },
      })
    );
  }

  if (policy.allowMixedCurrency) {
    issues.push(
      buildValidationIssue("CURRENCY_MISMATCH", stage, {
        message:
          "Mixed-currency resolutions are not enabled (no FX policy). Fail closed.",
        details: { allowMixedCurrency: true },
      })
    );
  }

  // Configuration presence (pre-calc)
  const configStage = COMMERCIAL_VALIDATION_STAGES.PRE_CONFIGURATION;
  if (
    policy.requireTaxConfiguration &&
    (!input.taxRules || input.taxRules.length === 0)
  ) {
    issues.push(
      buildValidationIssue("REQUIRED_CONFIGURATION_MISSING", configStage, {
        field: "taxRules",
        message: COMMERCIAL_USER_MESSAGES.TAX_CONFIGURATION_MISSING,
        actionableHint:
          COMMERCIAL_ERROR_ACTIONABLE_HINTS.TAX_CONFIGURATION_MISSING,
        details: { missing: "tax" },
      })
    );
  }

  if (
    policy.requireAdjustmentConfiguration &&
    (!input.adjustmentRules || input.adjustmentRules.length === 0)
  ) {
    issues.push(
      buildValidationIssue("REQUIRED_CONFIGURATION_MISSING", configStage, {
        field: "adjustmentRules",
        message: COMMERCIAL_USER_MESSAGES.ADJUSTMENT_CONFIGURATION_MISSING,
        actionableHint:
          COMMERCIAL_ERROR_ACTIONABLE_HINTS.ADJUSTMENT_CONFIGURATION_MISSING,
        details: { missing: "adjustment" },
      })
    );
  }

  // Currency consistency across supplied rules
  const currency = input.currencyCode?.trim().toUpperCase() ?? null;
  if (currency && input.taxRules) {
    for (const rule of input.taxRules) {
      if (
        rule.currencyCode &&
        rule.currencyCode.trim().toUpperCase() !== currency
      ) {
        issues.push(
          buildValidationIssue("CURRENCY_MISMATCH", configStage, {
            field: "taxRules",
            ruleId: rule.taxRuleId,
            details: {
              ruleCurrency: rule.currencyCode,
              requestCurrency: currency,
            },
          })
        );
      }
    }
  }
  if (currency && input.adjustmentRules) {
    for (const rule of input.adjustmentRules) {
      if (
        rule.currencyCode &&
        rule.currencyCode.trim().toUpperCase() !== currency
      ) {
        issues.push(
          buildValidationIssue("CURRENCY_MISMATCH", configStage, {
            field: "adjustmentRules",
            ruleId: rule.adjustmentRuleId,
            details: {
              ruleCurrency: rule.currencyCode,
              requestCurrency: currency,
            },
          })
        );
      }
    }
  }

  return {
    ok: issues.length === 0,
    stage: issues.length === 0 ? stage : (issues[0]?.stage ?? stage),
    businessId: input.businessId || contextBusinessId,
    issues,
  };
}

/**
 * Post-validate composition / resolution integrity (currency + reconcile).
 */
export function validateResolutionIntegrity(
  resolution: CommercialResolution,
  options?: { allowNegativePayable?: boolean }
): CommercialValidationReport {
  const stage = COMMERCIAL_VALIDATION_STAGES.POST_COMPOSITION;
  const issues: CommercialValidationIssue[] = [];
  const currency = resolution.currencyCode?.trim().toUpperCase();

  if (!currency) {
    issues.push(
      buildValidationIssue("INVALID_CURRENCY", stage, { field: "currencyCode" })
    );
  }

  let sum = zeroScaled(currency || "XXX", COMMERCIAL_INTERNAL_MONEY_SCALE);
  for (const component of resolution.components) {
    if (!component.componentId?.trim() || !component.componentType?.trim()) {
      issues.push(
        buildValidationIssue("INVALID_COMMERCIAL_COMPONENT", stage, {
          details: { component },
        })
      );
      continue;
    }
    if (
      currency &&
      component.currencyCode.trim().toUpperCase() !== currency
    ) {
      issues.push(
        buildValidationIssue("CURRENCY_MISMATCH", stage, {
          field: "components",
          details: {
            componentId: component.componentId,
            componentCurrency: component.currencyCode,
            resolutionCurrency: currency,
          },
        })
      );
      continue;
    }
    try {
      const scaled = parseMoneyToScaled(
        component.amount,
        component.currencyCode,
        COMMERCIAL_INTERNAL_MONEY_SCALE
      );
      sum = {
        units: sum.units + scaled.units,
        scale: sum.scale,
        currencyCode: sum.currencyCode,
      };
    } catch {
      issues.push(
        buildValidationIssue("INVALID_COMPONENT_AMOUNT", stage, {
          details: { componentId: component.componentId, amount: component.amount },
        })
      );
    }
  }

  if (currency && issues.every((i) => i.family !== "CURRENCY")) {
    try {
      const payable = parseMoneyToScaled(
        resolution.payable,
        currency,
        COMMERCIAL_INTERNAL_MONEY_SCALE
      );
      if (sum.units !== payable.units) {
        issues.push(
          buildValidationIssue("ROUNDING_INTEGRITY_FAILURE", stage, {
            details: {
              componentSum: scaledToString(sum),
              payable: resolution.payable,
            },
          })
        );
      }
      if (
        !options?.allowNegativePayable &&
        payable.units < BigInt(0)
      ) {
        issues.push(
          buildValidationIssue("PAYABLE_WOULD_BE_NEGATIVE", stage, {
            details: { payable: resolution.payable },
          })
        );
      }
    } catch {
      issues.push(
        buildValidationIssue("INVALID_COMPONENT_AMOUNT", stage, {
          field: "payable",
        })
      );
    }
  }

  if (!resolution.composition?.reconciled) {
    issues.push(
      buildValidationIssue("COMMERCIAL_COMPOSITION_CONFLICT", stage)
    );
  }

  return {
    ok: issues.length === 0,
    stage,
    businessId: resolution.businessId,
    issues,
    determinismFingerprint:
      issues.length === 0
        ? buildDeterminismFingerprint(resolution)
        : null,
  };
}

/**
 * Deterministic fingerprint over monetary commercial identity (not cryptographic).
 * Identical inputs + rule versions → identical fingerprint on success.
 */
export function buildDeterminismFingerprint(
  resolution: Pick<
    CommercialResolution,
    | "businessId"
    | "offeringId"
    | "currencyCode"
    | "quantity"
    | "effectiveAt"
    | "payable"
    | "components"
    | "basePrice"
    | "provenance"
  >
): string {
  const payload = {
    businessId: resolution.businessId,
    offeringId: resolution.offeringId,
    currencyCode: resolution.currencyCode,
    quantity: resolution.quantity,
    effectiveAt: resolution.effectiveAt,
    payable: resolution.payable,
    pricingItemId: resolution.basePrice.pricingItemId,
    unitPrice: resolution.basePrice.unitPrice,
    taxRuleIds: [...resolution.provenance.taxRuleIds].sort(),
    adjustmentRuleIds: [...resolution.provenance.adjustmentRuleIds].sort(),
    components: resolution.components.map((c) => ({
      id: c.componentId,
      type: c.componentType,
      amount: c.amount,
      currency: c.currencyCode,
    })),
  };
  const json = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `c09-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function assertDeterministicMatch(
  first: string,
  second: string
): void {
  if (first !== second) {
    throw new CommercialError(
      "DETERMINISM_CHECK_FAILED",
      COMMERCIAL_USER_MESSAGES.DETERMINISM_CHECK_FAILED,
      409,
      undefined,
      { first, second }
    );
  }
}

/**
 * Validate commercial rule payload at configuration save (IP-08 hook).
 */
export function validateCommercialConfigurationPayload(
  input: CreateCommercialRuleDraftInput
): CommercialValidationReport {
  const stage = COMMERCIAL_VALIDATION_STAGES.CONFIGURATION_SAVE;
  const issues: CommercialValidationIssue[] = [];

  if (!input.ruleKey?.trim()) {
    issues.push(
      buildValidationIssue("INVALID_INPUT", stage, { field: "ruleKey" })
    );
  }
  if (!input.label?.trim()) {
    issues.push(
      buildValidationIssue("INVALID_INPUT", stage, { field: "label" })
    );
  }
  if (!input.payload || typeof input.payload !== "object") {
    issues.push(
      buildValidationIssue("INVALID_INPUT", stage, { field: "payload" })
    );
  }

  if (input.currencyCode != null && !String(input.currencyCode).trim()) {
    issues.push(
      buildValidationIssue("INVALID_CURRENCY", stage, { field: "currencyCode" })
    );
  }

  const rate = input.payload?.ratePercent;
  if (rate != null && (!Number.isFinite(Number(rate)) || Number(rate) < 0)) {
    issues.push(
      buildValidationIssue("INVALID_TAX_RATE", stage, {
        field: "payload.ratePercent",
      })
    );
  }

  const fixed = input.payload?.fixedAmount;
  if (fixed != null) {
    const n = Number(fixed);
    if (!Number.isFinite(n) || n < 0) {
      issues.push(
        buildValidationIssue("INVALID_ADJUSTMENT_AMOUNT", stage, {
          field: "payload.fixedAmount",
        })
      );
    }
  }

  // Optional dependency graph validation when supplied on payload
  const componentIds = input.payload?.componentIds;
  const edges = input.payload?.dependencyEdges;
  if (Array.isArray(componentIds) && Array.isArray(edges)) {
    const circular = detectCircularDependencies(
      componentIds as string[],
      edges as Array<{ fromComponentId: string; toComponentId: string }>
    );
    if (circular) {
      issues.push(
        buildValidationIssue("CIRCULAR_COMPONENT_DEPENDENCY", stage, {
          field: "payload.dependencyEdges",
        })
      );
    }
  }

  return {
    ok: issues.length === 0,
    stage,
    businessId: "",
    issues,
  };
}
