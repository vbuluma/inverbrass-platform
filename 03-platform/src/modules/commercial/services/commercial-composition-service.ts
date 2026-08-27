/**
 * Purpose:
 * Compose commercial components from IP-01 ResolvedBasePrice.
 * Does not calculate tax/discount/commission rules (IP-03/IP-04).
 * Does not persist snapshots (IP-06).
 *
 * Implementation Package:
 * BP-005 / IP-02 – Price Components & Charge Composition
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  COMMERCIAL_COMPONENT_TYPE_CODES,
  COMMERCIAL_IP,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  addScaled,
  applySignedAmount,
  COMMERCIAL_DEFAULT_PRESENTATION_SCALE,
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  multiplyScaledByNumber,
  parseMoneyToScaled,
  roundScaledToPresentation,
  scaledToNumber,
  scaledToString,
  zeroScaled,
  type CommercialRoundingMode,
  type ScaledMoney,
} from "@/modules/commercial/money/commercial-money";
import {
  assertNonNegativeMagnitude,
  orderComponentsByDependencies,
  resolveComponentTypeCatalogue,
  resolveComponentTypeOrder,
} from "@/modules/commercial/services/commercial-component-rules";
import { createBasePriceResolutionService } from "@/modules/commercial/services/base-price-resolution-service";
import type {
  BasePriceResolutionRequest,
  CommercialCompositionRequest,
  ResolvedCommercialComponent,
  ResolvedCommercialComposition,
} from "@/modules/commercial/types";

const PRINCIPAL_COMPONENT_ID = "principal";

export class CommercialCompositionService {
  constructor(
    private readonly basePriceResolution = createBasePriceResolutionService()
  ) {}

  /**
   * Full path: IP-01 resolve → IP-02 compose (never bypasses IP-01 for base).
   */
  async composeFromBasePriceRequest(
    context: CurrentBusinessContext,
    baseRequest: BasePriceResolutionRequest,
    composition: Omit<CommercialCompositionRequest, "resolvedBasePrice" | "businessId"> & {
      businessId?: string;
    } = {}
  ): Promise<ResolvedCommercialComposition> {
    const resolvedBasePrice = await this.basePriceResolution.resolveBasePrice(
      context,
      baseRequest
    );

    return this.compose(context, {
      businessId: composition.businessId ?? baseRequest.businessId,
      resolvedBasePrice,
      quantity: composition.quantity ?? baseRequest.quantity ?? 1,
      additionalComponents: composition.additionalComponents,
      componentTypes: composition.componentTypes,
      componentOrder: composition.componentOrder,
      dependencyEdges: composition.dependencyEdges,
      presentationScale: composition.presentationScale,
      roundingMode: composition.roundingMode,
    });
  }

  /**
   * Compose from an existing IP-01 ResolvedBasePrice (must not be invented).
   */
  compose(
    context: CurrentBusinessContext,
    request: CommercialCompositionRequest
  ): ResolvedCommercialComposition {
    this.assertBusinessIsolation(context, request);

    const base = request.resolvedBasePrice;
    if (!base) {
      throw new CommercialError(
        "MISSING_RESOLVED_BASE_PRICE",
        COMMERCIAL_USER_MESSAGES.MISSING_RESOLVED_BASE_PRICE,
        400,
        "resolvedBasePrice"
      );
    }

    if (base.provenance.businessId !== request.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId",
        {
          requestBusinessId: request.businessId,
          baseProvenanceBusinessId: base.provenance.businessId,
        }
      );
    }

    const quantity =
      request.quantity == null || request.quantity === undefined
        ? 1
        : request.quantity;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new CommercialError(
        "INVALID_INPUT",
        "quantity must be a positive number for commercial composition.",
        400,
        "quantity"
      );
    }

    const currencyCode = base.currencyCode.trim().toUpperCase();
    const roundingMode: CommercialRoundingMode =
      request.roundingMode ?? "HALF_UP";
    const presentationScale =
      request.presentationScale ?? COMMERCIAL_DEFAULT_PRESENTATION_SCALE;
    const catalogue = resolveComponentTypeCatalogue(request.componentTypes);
    const typeOrder = resolveComponentTypeOrder(
      request.componentOrder,
      catalogue
    );

    const principalType = catalogue.get(
      COMMERCIAL_COMPONENT_TYPE_CODES.PRINCIPAL
    );
    if (!principalType) {
      throw new CommercialError(
        "UNKNOWN_COMPONENT_TYPE",
        "PRINCIPAL component type is required in the commercial type catalogue.",
        400,
        "componentTypes"
      );
    }

    const unitScaled = parseMoneyToScaled(
      base.unitPrice,
      currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    const computedPrincipal = multiplyScaledByNumber(
      unitScaled,
      quantity,
      roundingMode
    );
    const principalMagnitude =
      request.principalAmountOverride != null &&
      request.principalAmountOverride !== undefined
        ? parseMoneyToScaled(
            request.principalAmountOverride,
            currencyCode,
            COMMERCIAL_INTERNAL_MONEY_SCALE
          )
        : computedPrincipal;
    const principalSigned = applySignedAmount(
      principalMagnitude,
      principalType.sign
    );
    const principalBasis =
      request.principalAmountOverride != null &&
      request.principalAmountOverride !== undefined
        ? request.principalOverrideBasis?.trim() ||
          `IP-03 principal override (${scaledToString(principalMagnitude)}) from IP-01 base ${scaledToString(computedPrincipal)}`
        : `IP-01 unitPrice × quantity (${scaledToString(unitScaled)} × ${quantity})`;

    const draftComponents: Array<{
      id: string;
      typeCode: string;
      signed: ScaledMoney;
      basis: string;
      provenance: ResolvedCommercialComponent["provenance"];
    }> = [
      {
        id: PRINCIPAL_COMPONENT_ID,
        typeCode: principalType.code,
        signed: principalSigned,
        basis: principalBasis,
        provenance: {
          source: "IP-01_RESOLVED_BASE_PRICE",
          pricingItemId: base.pricingItemId,
          pricingCatalogueId: base.pricingCatalogueId,
          pricingMethod: base.pricingMethod,
          notes:
            request.principalAmountOverride != null
              ? `Resolved by ${COMMERCIAL_IP.IP_01_BASE_PRICE}; principal adjusted via ${COMMERCIAL_IP.IP_03_TAX}`
              : `Resolved by ${COMMERCIAL_IP.IP_01_BASE_PRICE}`,
        },
      },
    ];

    const additional = request.additionalComponents ?? [];
    const seenIds = new Set<string>([PRINCIPAL_COMPONENT_ID]);

    for (const contribution of additional) {
      if (seenIds.has(contribution.componentId)) {
        throw new CommercialError(
          "DUPLICATE_COMPONENT_IDENTITY",
          COMMERCIAL_USER_MESSAGES.DUPLICATE_COMPONENT_IDENTITY,
          409,
          "componentId",
          { componentId: contribution.componentId }
        );
      }
      seenIds.add(contribution.componentId);

      const type = catalogue.get(contribution.componentTypeCode);
      if (!type) {
        throw new CommercialError(
          "UNKNOWN_COMPONENT_TYPE",
          COMMERCIAL_USER_MESSAGES.UNKNOWN_COMPONENT_TYPE,
          400,
          "componentTypeCode",
          { componentTypeCode: contribution.componentTypeCode }
        );
      }

      if (contribution.componentTypeCode === COMMERCIAL_COMPONENT_TYPE_CODES.PRINCIPAL) {
        throw new CommercialError(
          "INVALID_INPUT",
          "Principal/base must come from IP-01 ResolvedBasePrice; do not supply PRINCIPAL as an additional component.",
          400,
          "componentTypeCode"
        );
      }

      const contribCurrency = contribution.currencyCode.trim().toUpperCase();
      if (contribCurrency !== currencyCode) {
        throw new CommercialError(
          "CURRENCY_MISMATCH",
          COMMERCIAL_USER_MESSAGES.CURRENCY_MISMATCH,
          409,
          "currencyCode",
          {
            compositionCurrency: currencyCode,
            componentCurrency: contribCurrency,
            componentId: contribution.componentId,
          }
        );
      }

      assertNonNegativeMagnitude(contribution.amount);
      const magnitude = parseMoneyToScaled(
        contribution.amount,
        currencyCode,
        COMMERCIAL_INTERNAL_MONEY_SCALE
      );
      const signed = applySignedAmount(magnitude, type.sign);

      draftComponents.push({
        id: contribution.componentId,
        typeCode: type.code,
        signed,
        basis:
          contribution.calculationBasis?.trim() ||
          `${type.code} supplied magnitude`,
        provenance: {
          source: contribution.provenance?.source ?? "SUPPLIED_COMPONENT",
          pricingItemId: contribution.provenance?.pricingItemId ?? null,
          pricingCatalogueId: contribution.provenance?.pricingCatalogueId ?? null,
          pricingMethod: contribution.provenance?.pricingMethod ?? null,
          ruleId: contribution.provenance?.ruleId ?? null,
          ruleVersion: contribution.provenance?.ruleVersion ?? null,
          notes: contribution.provenance?.notes ?? null,
        },
      });
    }

    const dependencyEdges = [
      ...(request.dependencyEdges ?? []),
      ...additional.flatMap((c) =>
        (c.dependsOn ?? []).map((dep) => ({
          fromComponentId: c.componentId,
          toComponentId: dep,
        }))
      ),
    ];

    // Primary order: dependency graph; type catalogue order breaks ties among independent nodes
    const typeRank = new Map(typeOrder.map((code, index) => [code, index]));
    const idsSortedByType = [...draftComponents]
      .sort((a, b) => {
        const ra = typeRank.get(a.typeCode) ?? Number.MAX_SAFE_INTEGER;
        const rb = typeRank.get(b.typeCode) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) {
          return ra - rb;
        }
        return a.id.localeCompare(b.id);
      })
      .map((c) => c.id);

    const orderedIds = orderComponentsByDependencies(
      idsSortedByType,
      dependencyEdges
    );

    const byId = new Map(draftComponents.map((c) => [c.id, c]));
    const resolvedComponents: ResolvedCommercialComponent[] = [];
    let payablePresented = zeroScaled(currencyCode, presentationScale);

    orderedIds.forEach((id, index) => {
      const draft = byId.get(id)!;
      const type = catalogue.get(draft.typeCode)!;
      const presented = roundScaledToPresentation(
        draft.signed,
        presentationScale,
        roundingMode
      );
      payablePresented = addScaled(payablePresented, presented);

      resolvedComponents.push({
        componentId: draft.id,
        componentTypeCode: type.code,
        componentTypeLabel: type.label,
        sign: type.sign,
        category: type.category,
        amount: scaledToString(presented),
        amountNumber: scaledToNumber(presented),
        currencyCode,
        calculationBasis: draft.basis,
        calculationOrder: index + 1,
        provenance: draft.provenance,
      });
    });

    // Reconcile by construction: payable == signed sum of presented components
    let presentedSum = zeroScaled(currencyCode, presentationScale);
    for (const component of resolvedComponents) {
      presentedSum = addScaled(
        presentedSum,
        parseMoneyToScaled(component.amount, currencyCode, presentationScale)
      );
    }

    if (presentedSum.units !== payablePresented.units) {
      throw new CommercialError(
        "COMPOSITION_RECONCILIATION_FAILED",
        COMMERCIAL_USER_MESSAGES.COMPOSITION_RECONCILIATION_FAILED,
        409,
        undefined,
        {
          componentSum: scaledToString(presentedSum),
          payableCandidate: scaledToString(payablePresented),
        }
      );
    }

    return {
      businessId: request.businessId,
      currencyCode,
      effectiveAt: base.effectiveAt,
      offeringId: base.offeringId,
      quantity,
      components: resolvedComponents,
      payableCandidate: scaledToString(payablePresented),
      payableCandidateNumber: scaledToNumber(payablePresented),
      presentationScale,
      roundingMode,
      reconciled: true,
      basePriceProvenance: base.provenance,
      composedAt: new Date().toISOString(),
    };
  }

  private assertBusinessIsolation(
    context: CurrentBusinessContext,
    request: CommercialCompositionRequest
  ): void {
    if (!request.businessId) {
      throw new CommercialError(
        "INVALID_INPUT",
        "businessId is required for commercial composition.",
        400,
        "businessId"
      );
    }
    if (request.businessId !== context.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId"
      );
    }
  }
}

export function createCommercialCompositionService() {
  return new CommercialCompositionService();
}
