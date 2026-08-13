/**
 * Purpose:
 * IP-06 snapshot validation and integrity hashing (exact money reconcile).
 *
 * Implementation Package:
 * BP-005 / IP-06 – Commercial Resolution Snapshot & Transaction Contract
 */

import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
  scaledToString,
  zeroScaled,
} from "@/modules/commercial/money/commercial-money";
import type {
  CommercialResolution,
  CommercialSnapshot,
} from "@/modules/commercial/types";

/**
 * Deterministic integrity hash over monetary/commercial identity fields.
 * Not cryptographic security — collision-resistant enough for snapshot integrity checks.
 */
export function computeCommercialIntegrityHash(
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
  >
): string {
  const payload = {
    businessId: resolution.businessId,
    offeringId: resolution.offeringId,
    currencyCode: resolution.currencyCode,
    quantity: resolution.quantity,
    effectiveAt: resolution.effectiveAt,
    payable: resolution.payable,
    basePriceItemId: resolution.basePrice.pricingItemId,
    baseUnitPrice: resolution.basePrice.unitPrice,
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
  return `c06-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function reconcileResolutionPayable(
  resolution: CommercialResolution
): void {
  if (!resolution.currencyCode?.trim()) {
    throw new CommercialError(
      "INVALID_CURRENCY",
      COMMERCIAL_USER_MESSAGES.INVALID_CURRENCY,
      400,
      "currencyCode"
    );
  }

  let sum = zeroScaled(
    resolution.currencyCode,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );

  for (const component of resolution.components) {
    if (component.currencyCode !== resolution.currencyCode) {
      throw new CommercialError(
        "INVALID_CURRENCY",
        COMMERCIAL_USER_MESSAGES.INVALID_CURRENCY,
        409,
        "currencyCode",
        {
          componentId: component.componentId,
          componentCurrency: component.currencyCode,
          resolutionCurrency: resolution.currencyCode,
        }
      );
    }
    if (!component.componentType?.trim() || !component.componentId?.trim()) {
      throw new CommercialError(
        "INVALID_COMMERCIAL_COMPONENT",
        COMMERCIAL_USER_MESSAGES.INVALID_COMMERCIAL_COMPONENT,
        400,
        undefined,
        { component }
      );
    }
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
  }

  const payableScaled = parseMoneyToScaled(
    resolution.payable,
    resolution.currencyCode,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );

  if (sum.units !== payableScaled.units) {
    throw new CommercialError(
      "COMMERCIAL_AMOUNT_MISMATCH",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_AMOUNT_MISMATCH,
      409,
      undefined,
      {
        componentSum: scaledToString(sum),
        payable: resolution.payable,
      }
    );
  }

  if (!resolution.composition.reconciled) {
    throw new CommercialError(
      "COMMERCIAL_COMPOSITION_CONFLICT",
      COMMERCIAL_USER_MESSAGES.COMMERCIAL_COMPOSITION_CONFLICT,
      409
    );
  }
}

export function assertCommercialSnapshotValid(
  snapshot: CommercialSnapshot
): void {
  if (!snapshot?.immutable || !snapshot.resolution) {
    throw new CommercialError(
      "SNAPSHOT_INVALID",
      COMMERCIAL_USER_MESSAGES.SNAPSHOT_INVALID,
      400
    );
  }
  if (snapshot.businessId !== snapshot.resolution.businessId) {
    throw new CommercialError(
      "INVALID_CONTEXT",
      COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
      403,
      "businessId"
    );
  }

  reconcileResolutionPayable(snapshot.resolution);

  const expected = computeCommercialIntegrityHash(snapshot.resolution);
  if (expected !== snapshot.integrityHash) {
    throw new CommercialError(
      "SNAPSHOT_INVALID",
      COMMERCIAL_USER_MESSAGES.SNAPSHOT_INVALID,
      409,
      undefined,
      {
        expectedHash: expected,
        actualHash: snapshot.integrityHash,
        reason: "Integrity hash mismatch — snapshot may have been mutated.",
      }
    );
  }
}

/** Deep JSON clone — freezes monetary payload from later mutation of source objects. */
export function cloneCommercialResolution(
  resolution: CommercialResolution
): CommercialResolution {
  return JSON.parse(JSON.stringify(resolution)) as CommercialResolution;
}
