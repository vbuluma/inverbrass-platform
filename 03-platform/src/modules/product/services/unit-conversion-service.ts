/**
 * Purpose:
 * Convert quantities between units within the same category.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createUnitRepository } from "@/modules/product/repositories/unit-repository";
import {
  applyRounding,
  canConvertWithinCategory,
  convertQuantity,
  isValidConversionFactor,
  parseConversionFactor,
} from "@/modules/product/services/unit-rules";
import type { UnitConversionResultView } from "@/modules/product/types";

type UnitRow = {
  id: string;
  categoryId: string;
  name: string;
  symbol: string;
  conversionFactor: string;
  decimalPrecision: number;
  roundingRule: string;
};

export class UnitConversionService {
  constructor(private readonly unitRepository = createUnitRepository()) {}

  convert(
    fromUnit: UnitRow,
    toUnit: UnitRow,
    value: number
  ): UnitConversionResultView {
    if (!canConvertWithinCategory(fromUnit.categoryId, toUnit.categoryId)) {
      throw new ProductError(
        "UNIT_CATEGORY_MISMATCH",
        PRODUCT_USER_MESSAGES.UNIT_CATEGORY_MISMATCH,
        400
      );
    }

    const fromFactor = parseConversionFactor(fromUnit.conversionFactor);
    const toFactor = parseConversionFactor(toUnit.conversionFactor);

    if (!isValidConversionFactor(fromFactor) || !isValidConversionFactor(toFactor)) {
      throw new ProductError(
        "INVALID_CONVERSION_FACTOR",
        PRODUCT_USER_MESSAGES.INVALID_CONVERSION_FACTOR,
        400
      );
    }

    const raw = convertQuantity(value, fromFactor, toFactor);
    const convertedValue = applyRounding(
      raw,
      toUnit.decimalPrecision,
      toUnit.roundingRule
    );

    return {
      fromUnitId: fromUnit.id,
      toUnitId: toUnit.id,
      inputValue: value,
      convertedValue,
      fromSymbol: fromUnit.symbol,
      toSymbol: toUnit.symbol,
    };
  }

  async convertByIds(
    businessId: string,
    fromUnitId: string,
    toUnitId: string,
    value: number
  ): Promise<UnitConversionResultView> {
    const [fromUnit, toUnit] = await Promise.all([
      this.unitRepository.findById(businessId, fromUnitId),
      this.unitRepository.findById(businessId, toUnitId),
    ]);

    if (!fromUnit || !toUnit) {
      throw new ProductError(
        "UNIT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.UNIT_NOT_FOUND,
        404
      );
    }

    return this.convert(fromUnit, toUnit, value);
  }
}

export function createUnitConversionService() {
  return new UnitConversionService();
}
