/**
 * Purpose:
 * Pure builders/validators for the IP-10 downstream commercial contract.
 * Does not recalculate price, tax, discount, or commission.
 *
 * Implementation Package:
 * BP-005 / IP-10 – Downstream Commercial Contract & Integration
 */

import {
  COMMERCIAL_CONTRACT_STATUSES,
  COMMERCIAL_CONTRACT_VERSION,
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
  CommercialSnapshot,
  CommercialTransactionContract,
  ExpectedCommercialAmount,
} from "@/modules/commercial/types";

const RA_NOTE =
  "Expected commercial amount is authoritative for future revenue assurance. Actual collection and variance belong to BP-007+ / RA — not BP-005 IP-10.";

export function buildContractId(
  snapshotId: string,
  integrityHash: string
): string {
  const raw = `${snapshotId}|${integrityHash}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `c10-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function buildExpectedAmountId(snapshotId: string): string {
  return `exp-${snapshotId}`;
}

/**
 * Project IP-06 + IP-07 into the stable downstream contract (no recalculation).
 */
export function buildCommercialTransactionContract(input: {
  snapshot: CommercialSnapshot;
  expected: ExpectedCommercialAmount;
  determinismFingerprint?: string | null;
  consumerRef?: string | null;
  consumedAt?: string;
}): CommercialTransactionContract {
  const { snapshot, expected } = input;
  const resolution = snapshot.resolution;
  const base = resolution.basePrice;
  const baseProv = resolution.provenance.basePrice;

  return {
    contractVersion: COMMERCIAL_CONTRACT_VERSION,
    contractId: buildContractId(snapshot.snapshotId, snapshot.integrityHash),
    ip: "IP-10",
    status: COMMERCIAL_CONTRACT_STATUSES.VALIDATED,
    identity: {
      businessId: snapshot.businessId,
      snapshotId: snapshot.snapshotId,
      resolutionId: resolution.resolutionId,
      expectedAmountId: buildExpectedAmountId(snapshot.snapshotId),
      effectiveAt: expected.effectiveAt,
      frozenAt: snapshot.frozenAt,
      generatedAt: expected.generatedAt,
    },
    commercial: {
      currency: expected.currency,
      principalAmount: expected.principalAmount,
      principalAmountNumber: expected.principalAmountNumber,
      totalCharges: expected.totalComponentAmount,
      totalChargesNumber: expected.totalComponentAmountNumber,
      totalDiscounts: expected.totalDiscountAmount,
      totalDiscountsNumber: expected.totalDiscountAmountNumber,
      totalTax: expected.totalTaxAmount,
      totalTaxNumber: expected.totalTaxAmountNumber,
      totalCommission: expected.totalCommissionAmount,
      totalCommissionNumber: expected.totalCommissionAmountNumber,
      expectedPayable: expected.expectedAmount,
      expectedPayableNumber: expected.expectedAmountNumber,
    },
    breakdown: expected.components.map((c) => ({ ...c })),
    provenance: {
      snapshotId: snapshot.snapshotId,
      resolutionId: resolution.resolutionId,
      businessId: snapshot.businessId,
      currency: expected.currency,
      pricingCatalogueId: base.pricingCatalogueId ?? null,
      pricingItemId: base.pricingItemId ?? null,
      pricingMethod: base.pricingMethod ?? null,
      pricingMethodLabel: base.pricingMethodLabel ?? null,
      catalogueCode: resolution.catalogueCode ?? null,
      precedenceOwner: baseProv.precedenceOwner ?? null,
      selectionMode: baseProv.selectionMode ?? null,
      taxRuleIds: [...resolution.provenance.taxRuleIds],
      adjustmentRuleIds: [...resolution.provenance.adjustmentRuleIds],
      pipeline: resolution.provenance.pipeline,
      commercialPipeline: resolution.provenance.pipeline,
      basePrice: structuredClone(baseProv),
    },
    integrity: {
      snapshotIntegrityHash: snapshot.integrityHash,
      determinismFingerprint: input.determinismFingerprint ?? null,
      immutable: true,
      validationStatus: "PASSED",
      expectedReconcilesToPayable: true,
    },
    actualAmountCollected: null,
    revenueAssuranceNote: RA_NOTE,
    paymentAllocation: null,
    consumerRef: input.consumerRef ?? null,
    consumedAt: input.consumedAt ?? new Date().toISOString(),
  };
}

export function assertExpectedMatchesSnapshot(
  snapshot: CommercialSnapshot,
  expected: ExpectedCommercialAmount
): void {
  if (expected.snapshotId !== snapshot.snapshotId) {
    throw new CommercialError(
      "COMMERCIAL_CONTRACT_TAMPERED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
      409,
      "snapshotId",
      {
        expectedSnapshotId: expected.snapshotId,
        snapshotId: snapshot.snapshotId,
      }
    );
  }
  if (expected.businessId !== snapshot.businessId) {
    throw new CommercialError(
      "BUSINESS_CONTEXT_MISMATCH",
      COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
      403,
      "businessId"
    );
  }
  if (expected.resolutionId !== snapshot.resolution.resolutionId) {
    throw new CommercialError(
      "COMMERCIAL_CONTRACT_TAMPERED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
      409,
      "resolutionId"
    );
  }
  if (
    expected.provenance.integrityHash &&
    expected.provenance.integrityHash !== snapshot.integrityHash
  ) {
    throw new CommercialError(
      "COMMERCIAL_CONTRACT_TAMPERED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
      409,
      "integrityHash"
    );
  }

  const payable = parseMoneyToScaled(
    snapshot.resolution.payable,
    snapshot.resolution.currencyCode,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );
  const expectedPayable = parseMoneyToScaled(
    expected.expectedAmount,
    expected.currency,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );
  if (payable.units !== expectedPayable.units) {
    throw new CommercialError(
      "COMMERCIAL_AMOUNT_RECONCILIATION_ERROR",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_AMOUNT_RECONCILIATION_ERROR,
      409,
      "expectedPayable",
      {
        snapshotPayable: snapshot.resolution.payable,
        expectedAmount: expected.expectedAmount,
      }
    );
  }
}

export function assertContractMatchesSnapshot(
  contract: CommercialTransactionContract,
  snapshot: CommercialSnapshot
): void {
  if (contract.identity.snapshotId !== snapshot.snapshotId) {
    throw new CommercialError(
      "COMMERCIAL_CONTRACT_TAMPERED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
      409,
      "snapshotId"
    );
  }
  if (contract.integrity.snapshotIntegrityHash !== snapshot.integrityHash) {
    throw new CommercialError(
      "COMMERCIAL_CONTRACT_TAMPERED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
      409,
      "integrityHash"
    );
  }
  const expectedId = buildContractId(
    snapshot.snapshotId,
    snapshot.integrityHash
  );
  if (contract.contractId !== expectedId) {
    throw new CommercialError(
      "COMMERCIAL_CONTRACT_TAMPERED",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_CONTRACT_TAMPERED,
      409,
      "contractId"
    );
  }
}
