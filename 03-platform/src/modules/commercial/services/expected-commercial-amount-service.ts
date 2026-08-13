/**
 * Purpose:
 * Derive ExpectedCommercialAmount from an immutable IP-06 CommercialSnapshot.
 *
 * IP-07 consumes IP-06 only — it does not recalculate pricing, tax, discounts,
 * or commissions from masters. It projects the amount the business expects to
 * charge/collect from the frozen commercial result.
 *
 * Actual collection, payment splits, and variance belong to BP-007+ / future RA.
 *
 * Implementation Package:
 * BP-005 / IP-07 – Expected Commercial Amount
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import { EXPECTED_AMOUNT_SIGN_CONVENTION } from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
  scaledToNumber,
  scaledToString,
} from "@/modules/commercial/money/commercial-money";
import {
  aggregateExpectedComponents,
  reconstructExpectedFromAggregates,
} from "@/modules/commercial/services/expected-commercial-amount-rules";
import { assertCommercialSnapshotValid } from "@/modules/commercial/services/commercial-snapshot-rules";
import type {
  CalculateExpectedAmountRequest,
  CommercialSnapshot,
  ExpectedCommercialAmount,
} from "@/modules/commercial/types";

const ACTUAL_NOTE =
  "Actual amount collected is not available in IP-07. Payment collection belongs to BP-007+.";
const VARIANCE_NOTE =
  "Variance (expected vs actual) is not available in IP-07. Revenue assurance / reconciliation is out of scope.";
const ALLOCATION_NOTE =
  "Payment allocation / split (cash, M-Pesa, card) is out of scope for IP-07. Expected commercial amount only.";

export class ExpectedCommercialAmountService {
  /**
   * Calculate the expected commercial amount from a finalized IP-06 snapshot.
   * Deterministic for the same businessId + snapshotId (financial fields).
   */
  calculateExpectedAmount(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot,
    request: CalculateExpectedAmountRequest = {}
  ): ExpectedCommercialAmount {
    this.assertBusinessScope(context, snapshot, request);
    this.assertSnapshotUsable(snapshot);

    const resolution = snapshot.resolution;
    const currency = resolution.currencyCode.trim().toUpperCase();

    if (!currency) {
      throw new CommercialError(
        "CURRENCY_MISMATCH",
        COMMERCIAL_USER_MESSAGES.CURRENCY_MISMATCH,
        400,
        "currencyCode"
      );
    }

    for (const component of resolution.components) {
      if (component.currencyCode.trim().toUpperCase() !== currency) {
        throw new CommercialError(
          "CURRENCY_MISMATCH",
          COMMERCIAL_USER_MESSAGES.CURRENCY_MISMATCH,
          409,
          "currencyCode",
          {
            componentId: component.componentId,
            componentCurrency: component.currencyCode,
            snapshotCurrency: currency,
          }
        );
      }
    }

    if (resolution.components.length === 0) {
      throw new CommercialError(
        "INVALID_COMMERCIAL_SNAPSHOT",
        COMMERCIAL_USER_MESSAGES.INVALID_COMMERCIAL_SNAPSHOT,
        400,
        undefined,
        { reason: "Snapshot has no commercial components." }
      );
    }

    const aggregates = aggregateExpectedComponents(
      resolution.components,
      currency
    );
    const reconstructed = reconstructExpectedFromAggregates(aggregates);
    const payableScaled = parseMoneyToScaled(
      resolution.payable,
      currency,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );

    if (aggregates.signedSum.units !== payableScaled.units) {
      throw new CommercialError(
        "COMMERCIAL_AMOUNT_RECONCILIATION_ERROR",
        COMMERCIAL_USER_MESSAGES.COMMERCIAL_AMOUNT_RECONCILIATION_ERROR,
        409,
        undefined,
        {
          signedComponentSum: scaledToString(aggregates.signedSum),
          snapshotPayable: resolution.payable,
        }
      );
    }

    if (reconstructed.units !== payableScaled.units) {
      throw new CommercialError(
        "COMMERCIAL_AMOUNT_RECONCILIATION_ERROR",
        COMMERCIAL_USER_MESSAGES.COMMERCIAL_AMOUNT_RECONCILIATION_ERROR,
        409,
        undefined,
        {
          reconstructedExpected: scaledToString(reconstructed),
          snapshotPayable: resolution.payable,
          principal: scaledToString(aggregates.principal),
          positiveCharges: scaledToString(aggregates.positiveCharges),
          tax: scaledToString(aggregates.tax),
          discounts: scaledToString(aggregates.discounts),
        }
      );
    }

    const expectedAmount = scaledToString(payableScaled);
    const expectedAmountNumber = scaledToNumber(payableScaled);

    if (!Number.isFinite(expectedAmountNumber)) {
      throw new CommercialError(
        "INVALID_EXPECTED_AMOUNT",
        COMMERCIAL_USER_MESSAGES.INVALID_EXPECTED_AMOUNT,
        409
      );
    }

    const result: ExpectedCommercialAmount = {
      businessId: snapshot.businessId,
      snapshotId: snapshot.snapshotId,
      resolutionId: resolution.resolutionId,
      generatedAt: snapshot.frozenAt,
      effectiveAt: resolution.effectiveAt,
      principalAmount: scaledToString(aggregates.principal),
      principalAmountNumber: scaledToNumber(aggregates.principal),
      totalComponentAmount: scaledToString(aggregates.positiveCharges),
      totalComponentAmountNumber: scaledToNumber(aggregates.positiveCharges),
      totalDiscountAmount: scaledToString(aggregates.discounts),
      totalDiscountAmountNumber: scaledToNumber(aggregates.discounts),
      totalTaxAmount: scaledToString(aggregates.tax),
      totalTaxAmountNumber: scaledToNumber(aggregates.tax),
      totalCommissionAmount: scaledToString(aggregates.commission),
      totalCommissionAmountNumber: scaledToNumber(aggregates.commission),
      payableAmount: resolution.payable,
      payableAmountNumber: resolution.payableNumber,
      expectedAmount,
      expectedAmountNumber,
      currency,
      components: aggregates.components,
      actualAmountCollected: null,
      actualAmountNote: ACTUAL_NOTE,
      variance: null,
      varianceNote: VARIANCE_NOTE,
      paymentAllocation: null,
      paymentAllocationNote: ALLOCATION_NOTE,
      signConvention: EXPECTED_AMOUNT_SIGN_CONVENTION.formula,
      provenance: {
        snapshotId: snapshot.snapshotId,
        businessId: snapshot.businessId,
        currency,
        integrityHash: snapshot.integrityHash,
        pipeline: `${resolution.provenance.pipeline}→IP-07`,
        commercialPipeline: resolution.provenance.pipeline,
        basePrice: resolution.provenance.basePrice,
        taxRuleIds: resolution.provenance.taxRuleIds,
        adjustmentRuleIds: resolution.provenance.adjustmentRuleIds,
        compositionReconciled: true,
        ip: "IP-07",
      },
    };

    return result;
  }

  private assertBusinessScope(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot,
    request: CalculateExpectedAmountRequest
  ): void {
    if (!context.businessId?.trim()) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        403,
        "businessId"
      );
    }
    if (snapshot.businessId !== context.businessId) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        403,
        "businessId",
        {
          snapshotBusinessId: snapshot.businessId,
          contextBusinessId: context.businessId,
        }
      );
    }
    if (
      request.businessId &&
      request.businessId.trim() !== snapshot.businessId
    ) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        403,
        "businessId",
        {
          requestedBusinessId: request.businessId,
          snapshotBusinessId: snapshot.businessId,
        }
      );
    }
  }

  private assertSnapshotUsable(snapshot: CommercialSnapshot): void {
    try {
      assertCommercialSnapshotValid(snapshot);
    } catch (error) {
      if (error instanceof CommercialError) {
        if (
          error.code === "SNAPSHOT_INVALID" &&
          error.details &&
          typeof error.details === "object" &&
          "reason" in error.details &&
          String(error.details.reason).includes("Integrity hash")
        ) {
          throw new CommercialError(
            "SNAPSHOT_INTEGRITY_FAILURE",
            COMMERCIAL_USER_MESSAGES.SNAPSHOT_INTEGRITY_FAILURE,
            409,
            error.field,
            error.details
          );
        }
        if (
          error.code === "SNAPSHOT_INVALID" ||
          error.code === "COMMERCIAL_AMOUNT_MISMATCH" ||
          error.code === "COMMERCIAL_COMPOSITION_CONFLICT" ||
          error.code === "INVALID_COMMERCIAL_COMPONENT" ||
          error.code === "INVALID_CONTEXT"
        ) {
          throw new CommercialError(
            "INVALID_COMMERCIAL_SNAPSHOT",
            COMMERCIAL_USER_MESSAGES.INVALID_COMMERCIAL_SNAPSHOT,
            error.statusCode,
            error.field,
            { cause: error.code, details: error.details }
          );
        }
        if (error.code === "INVALID_CURRENCY") {
          throw new CommercialError(
            "CURRENCY_MISMATCH",
            COMMERCIAL_USER_MESSAGES.CURRENCY_MISMATCH,
            error.statusCode,
            error.field,
            error.details
          );
        }
      }
      throw error;
    }

    if (!snapshot.immutable) {
      throw new CommercialError(
        "INVALID_COMMERCIAL_SNAPSHOT",
        COMMERCIAL_USER_MESSAGES.INVALID_COMMERCIAL_SNAPSHOT,
        400,
        undefined,
        { reason: "Snapshot is not marked immutable." }
      );
    }
  }
}

export function createExpectedCommercialAmountService() {
  return new ExpectedCommercialAmountService();
}
