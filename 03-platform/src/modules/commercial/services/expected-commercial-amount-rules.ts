/**
 * Purpose:
 * Pure classification / reconciliation helpers for IP-07 expected amount.
 *
 * Implementation Package:
 * BP-005 / IP-07 – Expected Commercial Amount
 */

import {
  COMMERCIAL_COMPONENT_TYPE_CODES,
  EXPECTED_AMOUNT_SIGN_CONVENTION,
} from "@/modules/commercial/constants";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
  scaledToNumber,
  scaledToString,
  zeroScaled,
  type ScaledMoney,
} from "@/modules/commercial/money/commercial-money";
import type {
  CommercialResolutionComponentView,
  ExpectedAmountLineRole,
  ExpectedCommercialComponent,
} from "@/modules/commercial/types";

export { EXPECTED_AMOUNT_SIGN_CONVENTION };

function isCommissionLike(component: CommercialResolutionComponentView): boolean {
  const type = component.componentType.trim().toUpperCase();
  if (type === COMMERCIAL_COMPONENT_TYPE_CODES.COMMISSION) {
    return true;
  }
  const code = (component.componentCode ?? "").toUpperCase();
  const description = (component.description ?? "").toUpperCase();
  const notes = (component.provenance?.notes ?? "").toUpperCase();
  if (
    type === COMMERCIAL_COMPONENT_TYPE_CODES.SURCHARGE &&
    (code.includes("COMM") ||
      description.includes("COMMISSION") ||
      notes.includes("COMM ") ||
      notes.startsWith("COMM "))
  ) {
    return true;
  }
  return false;
}

export function classifyExpectedLineRole(
  component: CommercialResolutionComponentView
): ExpectedAmountLineRole {
  const type = component.componentType.trim().toUpperCase();
  if (type === COMMERCIAL_COMPONENT_TYPE_CODES.PRINCIPAL) {
    return "PRINCIPAL";
  }
  if (
    type === COMMERCIAL_COMPONENT_TYPE_CODES.TAX ||
    type === COMMERCIAL_COMPONENT_TYPE_CODES.LEVY
  ) {
    return "TAX";
  }
  if (type === COMMERCIAL_COMPONENT_TYPE_CODES.DISCOUNT) {
    return "REDUCTION";
  }
  if (isCommissionLike(component)) {
    return "COMMISSION";
  }
  if (
    type === COMMERCIAL_COMPONENT_TYPE_CODES.FEE ||
    type === COMMERCIAL_COMPONENT_TYPE_CODES.SURCHARGE
  ) {
    return "CHARGE";
  }
  const amount = parseMoneyToScaled(
    component.amount,
    component.currencyCode,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );
  if (amount.units < BigInt(0)) {
    return "REDUCTION";
  }
  if (amount.units > BigInt(0)) {
    return "CHARGE";
  }
  return "OTHER";
}

export function roleSign(role: ExpectedAmountLineRole): "ADD" | "SUBTRACT" {
  return role === "REDUCTION" ? "SUBTRACT" : "ADD";
}

export function toExpectedComponent(
  component: CommercialResolutionComponentView
): ExpectedCommercialComponent {
  const role = classifyExpectedLineRole(component);
  const signed = parseMoneyToScaled(
    component.amount,
    component.currencyCode,
    COMMERCIAL_INTERNAL_MONEY_SCALE
  );
  const magnitude: ScaledMoney = {
    units: signed.units < BigInt(0) ? -signed.units : signed.units,
    scale: signed.scale,
    currencyCode: signed.currencyCode,
  };
  return {
    componentId: component.componentId,
    componentType: component.componentType,
    componentCode: component.componentCode,
    description: component.description,
    amount: component.amount,
    amountNumber: component.amountNumber,
    magnitude: scaledToString(magnitude),
    magnitudeNumber: scaledToNumber(magnitude),
    currencyCode: component.currencyCode,
    role,
    sign: roleSign(role),
    calculationBasis: component.calculationBasis,
    provenance: component.provenance,
  };
}

export type ExpectedAmountAggregates = {
  principal: ScaledMoney;
  positiveCharges: ScaledMoney;
  discounts: ScaledMoney;
  tax: ScaledMoney;
  commission: ScaledMoney;
  signedSum: ScaledMoney;
  components: ExpectedCommercialComponent[];
};

export function aggregateExpectedComponents(
  components: CommercialResolutionComponentView[],
  currencyCode: string
): ExpectedAmountAggregates {
  let principal = zeroScaled(currencyCode);
  let positiveCharges = zeroScaled(currencyCode);
  let discounts = zeroScaled(currencyCode);
  let tax = zeroScaled(currencyCode);
  let commission = zeroScaled(currencyCode);
  let signedSum = zeroScaled(currencyCode);
  const mapped: ExpectedCommercialComponent[] = [];

  for (const raw of components) {
    const line = toExpectedComponent(raw);
    mapped.push(line);
    const signed = parseMoneyToScaled(
      line.amount,
      currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    const magnitude = parseMoneyToScaled(
      line.magnitude,
      currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    signedSum = {
      units: signedSum.units + signed.units,
      scale: signedSum.scale,
      currencyCode,
    };

    switch (line.role) {
      case "PRINCIPAL":
        principal = {
          units: principal.units + magnitude.units,
          scale: principal.scale,
          currencyCode,
        };
        break;
      case "TAX":
        tax = {
          units: tax.units + magnitude.units,
          scale: tax.scale,
          currencyCode,
        };
        break;
      case "REDUCTION":
        discounts = {
          units: discounts.units + magnitude.units,
          scale: discounts.scale,
          currencyCode,
        };
        break;
      case "COMMISSION":
        commission = {
          units: commission.units + magnitude.units,
          scale: commission.scale,
          currencyCode,
        };
        positiveCharges = {
          units: positiveCharges.units + magnitude.units,
          scale: positiveCharges.scale,
          currencyCode,
        };
        break;
      case "CHARGE":
      case "OTHER":
        if (signed.units >= BigInt(0)) {
          positiveCharges = {
            units: positiveCharges.units + magnitude.units,
            scale: positiveCharges.scale,
            currencyCode,
          };
        } else {
          discounts = {
            units: discounts.units + magnitude.units,
            scale: discounts.scale,
            currencyCode,
          };
        }
        break;
      default:
        break;
    }
  }

  return {
    principal,
    positiveCharges,
    discounts,
    tax,
    commission,
    signedSum,
    components: mapped,
  };
}

/**
 * Formula reconstruction:
 * expected = principal + positiveCharges + tax − discounts
 */
export function reconstructExpectedFromAggregates(
  aggregates: ExpectedAmountAggregates
): ScaledMoney {
  return {
    units:
      aggregates.principal.units +
      aggregates.positiveCharges.units +
      aggregates.tax.units -
      aggregates.discounts.units,
    scale: aggregates.principal.scale,
    currencyCode: aggregates.principal.currencyCode,
  };
}
