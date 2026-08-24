"use server";

/**
 * Purpose:
 * Server actions for BP-005 commercial resolution workspace (IP-01 … IP-07 UX).
 *
 * Implementation Package:
 * BP-005 / IP-01–IP-03 – Commercial Resolution UX
 * BP-005 / IP-05 – Conflict explanation on base-price step
 * BP-005 / IP-06 – Review / snapshot finalize
 * BP-005 / IP-07 – Expected commercial amount
 */

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  CommercialError,
  COMMERCIAL_ERROR_ACTIONABLE_HINTS,
  COMMERCIAL_ERROR_CODE_FAMILY,
  createBasePriceResolutionService,
  createCommercialCompositionService,
  createCommercialContractService,
  createCommercialResolutionService,
  createExpectedCommercialAmountService,
  createTaxAwareCommercialCompositionService,
  toStructuredCommercialError,
  TAX_RULE_STATUS_CODES,
  TAX_TREATMENT_CODES,
  type CommercialSnapshot,
  type CommercialTransactionContract,
  type ExpectedCommercialAmount,
  type ResolvedBasePrice,
  type ResolvedCommercialComposition,
  type TaxResolutionResult,
  type TaxRuleConfiguration,
  type TaxTreatmentCode,
} from "@/modules/commercial";

export type CommercialActionError = {
  code: string;
  message: string;
  field?: string;
  family?: string;
  actionableHint?: string;
  stage?: string;
  payableProduced?: false;
};

export type CommercialActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: CommercialActionError };

async function requireCommercialContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new CommercialError(
      "INVALID_INPUT",
      "Your session has expired. Please sign in again.",
      401,
      "session"
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new CommercialError(
      "BUSINESS_CONTEXT_MISMATCH",
      "Select a business before resolving commercial amounts.",
      403,
      "businessId"
    );
  }

  return context;
}

function toActionError(error: unknown): CommercialActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof CommercialError) {
    let message = error.message;
    if (error.code === "BASE_PRICE_CONFLICT" && error.details) {
      const tied = Array.isArray(error.details.tiedPricingItemIds)
        ? (error.details.tiedPricingItemIds as string[]).join(", ")
        : "";
      const reason =
        typeof error.details.conflictReason === "string"
          ? error.details.conflictReason
          : "Candidates are equally specific.";
      message = [
        "Price configuration conflict (PRICE_CONFLICT).",
        reason,
        tied ? `Conflicting pricing items: ${tied}.` : null,
        "Open Product Workspace Pricing and resolve overlapping catalogue/item configuration. Do not pick a price arbitrarily in this workspace.",
      ]
        .filter(Boolean)
        .join(" ");
    }
    const structured = toStructuredCommercialError(error, {
      stage:
        typeof error.details?.stage === "string"
          ? error.details.stage
          : undefined,
      ruleId:
        typeof error.details?.ruleId === "string"
          ? error.details.ruleId
          : undefined,
    });
    const hint =
      structured.actionableHint ||
      COMMERCIAL_ERROR_ACTIONABLE_HINTS[error.code] ||
      undefined;
    return {
      success: false,
      error: {
        code: error.code,
        message,
        field: error.field,
        family:
          structured.family ||
          COMMERCIAL_ERROR_CODE_FAMILY[error.code] ||
          undefined,
        actionableHint: hint,
        stage: structured.stage,
        payableProduced: false,
      },
    };
  }
  if (error instanceof AuthError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        payableProduced: false,
      },
    };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Commercial resolution failed. Please try again.",
      payableProduced: false,
    },
  };
}

export type ResolveBasePriceActionInput = {
  offeringId: string;
  currencyCode: string;
  quantity?: number | null;
  pricingCatalogueId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  effectiveAt?: string | null;
  /** Existing party identity (BP-002) — optional commercial context. */
  partyId?: string | null;
};

export async function resolveCommercialBasePriceAction(
  input: ResolveBasePriceActionInput
): Promise<CommercialActionResult<ResolvedBasePrice>> {
  try {
    const context = await requireCommercialContext();
    if (!input.offeringId?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "Select an offering to resolve the base price.",
        400,
        "offeringId"
      );
    }
    if (!input.currencyCode?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "Currency is required.",
        400,
        "currencyCode"
      );
    }

    const data = await createBasePriceResolutionService().resolveBasePrice(
      context,
      {
        businessId: context.businessId,
        offeringId: input.offeringId.trim(),
        currencyCode: input.currencyCode.trim().toUpperCase(),
        quantity: input.quantity,
        pricingCatalogueId: input.pricingCatalogueId,
        customerSegment: input.customerSegment,
        salesChannel: input.salesChannel,
        region: input.region,
        effectiveAt: input.effectiveAt,
        partyId: input.partyId?.trim() || null,
      }
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function composeCommercialPrincipalAction(
  resolvedBasePrice: ResolvedBasePrice,
  quantity?: number | null
): Promise<CommercialActionResult<ResolvedCommercialComposition>> {
  try {
    const context = await requireCommercialContext();
    const data = createCommercialCompositionService().compose(context, {
      businessId: context.businessId,
      resolvedBasePrice,
      quantity: quantity ?? 1,
    });
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export type ApplyCommercialTaxActionInput = {
  resolvedBasePrice: ResolvedBasePrice;
  quantity?: number | null;
  taxTypeCode: string;
  taxTypeLabel: string;
  ratePercent: number;
  treatment: TaxTreatmentCode;
  taxRuleId?: string;
};

export type ApplyCommercialTaxActionResult = {
  tax: TaxResolutionResult;
  composition: ResolvedCommercialComposition;
};

export async function applyCommercialTaxAction(
  input: ApplyCommercialTaxActionInput
): Promise<CommercialActionResult<ApplyCommercialTaxActionResult>> {
  try {
    const context = await requireCommercialContext();

    if (!Number.isFinite(input.ratePercent) || input.ratePercent < 0) {
      throw new CommercialError(
        "INVALID_TAX_RATE",
        "Enter a valid tax rate (0 or greater).",
        400,
        "ratePercent"
      );
    }

    const allowedTreatments = Object.values(TAX_TREATMENT_CODES);
    if (!allowedTreatments.includes(input.treatment)) {
      throw new CommercialError(
        "INVALID_TAX_TREATMENT",
        "Select a valid tax treatment.",
        400,
        "treatment"
      );
    }

    const taxRules: TaxRuleConfiguration[] = [
      {
        taxRuleId: input.taxRuleId?.trim() || "session-tax-rule",
        businessId: context.businessId,
        taxTypeCode: input.taxTypeCode.trim() || "VAT",
        taxTypeLabel: input.taxTypeLabel.trim() || "VAT",
        ratePercent: input.ratePercent,
        treatment: input.treatment,
        status: TAX_RULE_STATUS_CODES.ACTIVE,
        effectiveFrom: "2000-01-01T00:00:00.000Z",
        effectiveTo: null,
        currencyCode: input.resolvedBasePrice.currencyCode,
      },
    ];

    const data = createTaxAwareCommercialCompositionService().composeWithTax(
      context,
      {
        businessId: context.businessId,
        resolvedBasePrice: input.resolvedBasePrice,
        quantity: input.quantity ?? 1,
        taxRules,
        requireTaxConfiguration: true,
      }
    );

    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export type FinalizeCommercialSnapshotActionInput = {
  offeringId: string;
  currencyCode: string;
  quantity?: number | null;
  pricingCatalogueId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  effectiveAt?: string | null;
  partyId?: string | null;
  taxTypeCode?: string;
  taxTypeLabel?: string;
  ratePercent?: number;
  treatment?: TaxTreatmentCode;
};

/**
 * IP-06 Review finalize — resolve full pipeline and freeze immutable snapshot.
 */
export async function finalizeCommercialSnapshotAction(
  input: FinalizeCommercialSnapshotActionInput
): Promise<CommercialActionResult<CommercialSnapshot>> {
  try {
    const context = await requireCommercialContext();
    if (!input.offeringId?.trim()) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        "Select an offering before finalizing commercial resolution.",
        400,
        "offeringId"
      );
    }
    if (!input.currencyCode?.trim()) {
      throw new CommercialError(
        "INVALID_CURRENCY",
        "Currency is required.",
        400,
        "currencyCode"
      );
    }

    const taxRules: TaxRuleConfiguration[] = [];
    if (
      input.ratePercent != null &&
      Number.isFinite(input.ratePercent) &&
      input.treatment
    ) {
      taxRules.push({
        taxRuleId: "session-tax-rule",
        businessId: context.businessId,
        taxTypeCode: input.taxTypeCode?.trim() || "VAT",
        taxTypeLabel: input.taxTypeLabel?.trim() || "VAT",
        ratePercent: input.ratePercent,
        treatment: input.treatment,
        status: TAX_RULE_STATUS_CODES.ACTIVE,
        effectiveFrom: "2000-01-01T00:00:00.000Z",
        effectiveTo: null,
        currencyCode: input.currencyCode.trim().toUpperCase(),
      });
    }

    const service = createCommercialResolutionService();
    const resolution = await service.resolve(context, {
      businessId: context.businessId,
      offeringId: input.offeringId.trim(),
      currencyCode: input.currencyCode.trim().toUpperCase(),
      quantity: input.quantity ?? 1,
      pricingCatalogueId: input.pricingCatalogueId,
      customerSegment: input.customerSegment,
      salesChannel: input.salesChannel,
      region: input.region,
      effectiveAt: input.effectiveAt,
      partyId: input.partyId,
      taxRules,
      requireTaxConfiguration: taxRules.length > 0,
    });
    const data = service.snapshot(resolution);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export type FinalizeCommercialExpectedActionResult = {
  snapshot: CommercialSnapshot;
  expected: ExpectedCommercialAmount;
  /** IP-10 downstream commercial contract — ready for BP-006/BP-007 consumers. */
  contract: CommercialTransactionContract;
};

/**
 * IP-06 + IP-07 + IP-10 — freeze snapshot, expected amount, and downstream contract.
 */
export async function finalizeCommercialExpectedAction(
  input: FinalizeCommercialSnapshotActionInput
): Promise<CommercialActionResult<FinalizeCommercialExpectedActionResult>> {
  try {
    const context = await requireCommercialContext();
    if (!input.offeringId?.trim()) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        "Select an offering before finalizing commercial resolution.",
        400,
        "offeringId"
      );
    }
    if (!input.currencyCode?.trim()) {
      throw new CommercialError(
        "INVALID_CURRENCY",
        "Currency is required.",
        400,
        "currencyCode"
      );
    }

    const taxRules: TaxRuleConfiguration[] = [];
    if (
      input.ratePercent != null &&
      Number.isFinite(input.ratePercent) &&
      input.treatment
    ) {
      taxRules.push({
        taxRuleId: "session-tax-rule",
        businessId: context.businessId,
        taxTypeCode: input.taxTypeCode?.trim() || "VAT",
        taxTypeLabel: input.taxTypeLabel?.trim() || "VAT",
        ratePercent: input.ratePercent,
        treatment: input.treatment,
        status: TAX_RULE_STATUS_CODES.ACTIVE,
        effectiveFrom: "2000-01-01T00:00:00.000Z",
        effectiveTo: null,
        currencyCode: input.currencyCode.trim().toUpperCase(),
      });
    }

    const service = createCommercialResolutionService();
    const pipeline = await service.resolveExpectedAmount(context, {
      businessId: context.businessId,
      offeringId: input.offeringId.trim(),
      currencyCode: input.currencyCode.trim().toUpperCase(),
      quantity: input.quantity ?? 1,
      pricingCatalogueId: input.pricingCatalogueId,
      customerSegment: input.customerSegment,
      salesChannel: input.salesChannel,
      region: input.region,
      effectiveAt: input.effectiveAt,
      partyId: input.partyId,
      taxRules,
      requireTaxConfiguration: taxRules.length > 0,
    });
    const contract = createCommercialContractService().consumeCommercialContract(
      context,
      {
        businessId: context.businessId,
        snapshot: pipeline.snapshot,
        expected: pipeline.expected,
        consumerRef: "commercial-resolve-workspace",
      }
    );
    return {
      success: true,
      data: {
        snapshot: pipeline.snapshot,
        expected: pipeline.expected,
        contract,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * IP-10 — consume an existing snapshot as the downstream commercial contract.
 */
export async function consumeCommercialContractAction(input: {
  snapshot: CommercialSnapshot;
  expected?: ExpectedCommercialAmount | null;
  expectedCurrency?: string | null;
  consumerRef?: string | null;
}): Promise<CommercialActionResult<CommercialTransactionContract>> {
  try {
    const context = await requireCommercialContext();
    const data = createCommercialContractService().consumeCommercialContract(
      context,
      {
        businessId: context.businessId,
        snapshot: input.snapshot,
        expected: input.expected,
        expectedCurrency: input.expectedCurrency,
        consumerRef: input.consumerRef ?? "commercial-resolve-workspace",
      }
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * IP-07 — derive expected amount from an existing IP-06 snapshot value object.
 */
export async function calculateExpectedCommercialAmountAction(
  snapshot: CommercialSnapshot
): Promise<CommercialActionResult<ExpectedCommercialAmount>> {
  try {
    const context = await requireCommercialContext();
    const data = createExpectedCommercialAmountService().calculateExpectedAmount(
      context,
      snapshot
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
