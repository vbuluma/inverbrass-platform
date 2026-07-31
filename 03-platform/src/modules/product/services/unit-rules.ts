/**
 * Purpose:
 * Pure business rules for Units of Measure (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import {
  UNIT_ROUNDING_RULES,
  UNIT_STATUS_CODES,
  type UnitRoundingRule,
  type UnitStatusCode,
} from "@/modules/product/constants";

export function normalizeUnitCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeUnitSymbol(symbol: string): string {
  return symbol.trim();
}

export function resolveDefaultUnitStatus(): UnitStatusCode {
  return UNIT_STATUS_CODES.ACTIVE;
}

export function unitStatusLabel(status: string): string {
  switch (status) {
    case UNIT_STATUS_CODES.DRAFT:
      return "Draft";
    case UNIT_STATUS_CODES.ACTIVE:
      return "Active";
    case UNIT_STATUS_CODES.SUSPENDED:
      return "Suspended";
    case UNIT_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function roundingRuleLabel(rule: string): string {
  switch (rule) {
    case UNIT_ROUNDING_RULES.HALF_UP:
      return "Half up";
    case UNIT_ROUNDING_RULES.HALF_DOWN:
      return "Half down";
    case UNIT_ROUNDING_RULES.CEILING:
      return "Ceiling";
    case UNIT_ROUNDING_RULES.FLOOR:
      return "Floor";
    case UNIT_ROUNDING_RULES.TRUNCATE:
      return "Truncate";
    default:
      return rule;
  }
}

export function isValidConversionFactor(factor: number): boolean {
  return Number.isFinite(factor) && factor > 0;
}

export function parseConversionFactor(value: string | number): number {
  const factor = typeof value === "number" ? value : Number(value);
  return factor;
}

export function canTransitionUnitStatus(
  current: string,
  next: string
): boolean {
  if (current === next) {
    return true;
  }
  if (current === UNIT_STATUS_CODES.ARCHIVED) {
    return false;
  }
  if (next === UNIT_STATUS_CODES.DRAFT) {
    return current === UNIT_STATUS_CODES.DRAFT;
  }
  return true;
}

export function isUnitAssignable(status: string): boolean {
  return status !== UNIT_STATUS_CODES.ARCHIVED;
}

export function isUnitEditable(status: string): boolean {
  return status !== UNIT_STATUS_CODES.ARCHIVED;
}

export function canConvertWithinCategory(
  fromCategoryId: string,
  toCategoryId: string
): boolean {
  return fromCategoryId === toCategoryId;
}

export function convertQuantity(
  value: number,
  fromFactor: number,
  toFactor: number
): number {
  return (value * fromFactor) / toFactor;
}

export function applyRounding(
  value: number,
  decimalPrecision: number,
  roundingRule: UnitRoundingRule | string
): number {
  const factor = 10 ** decimalPrecision;
  const scaled = value * factor;

  switch (roundingRule) {
    case UNIT_ROUNDING_RULES.CEILING:
      return Math.ceil(scaled) / factor;
    case UNIT_ROUNDING_RULES.FLOOR:
      return Math.floor(scaled) / factor;
    case UNIT_ROUNDING_RULES.TRUNCATE:
      return Math.trunc(scaled) / factor;
    case UNIT_ROUNDING_RULES.HALF_DOWN:
      return Math.round(scaled - 0.0000001) / factor;
    case UNIT_ROUNDING_RULES.HALF_UP:
    default:
      return Math.round(scaled) / factor;
  }
}

export function formatConversionDescription(
  fromName: string,
  fromSymbol: string,
  fromFactor: number,
  toName: string,
  toSymbol: string,
  toFactor: number
): string {
  const oneInTo = convertQuantity(1, fromFactor, toFactor);
  return `1 ${fromSymbol} (${fromName}) = ${oneInTo} ${toSymbol} (${toName})`;
}
