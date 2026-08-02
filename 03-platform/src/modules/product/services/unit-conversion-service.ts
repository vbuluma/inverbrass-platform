/**
 * Purpose:
 * Convert quantities between units within the same category.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { ProductError } from "@/modules/product/errors";
import type { ProductUserMessages } from "@/modules/product/product-user-messages";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
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
    msg: ProductUserMessages,
    fromUnit: UnitRow,
    toUnit: UnitRow,
    value: number
  ): UnitConversionResultView {
    if (!canConvertWithinCategory(fromUnit.categoryId, toUnit.categoryId)) {
      throw new ProductError(
        "UNIT_CATEGORY_MISMATCH",
        msg.UNIT_CATEGORY_MISMATCH,
        400
      );
    }

    const fromFactor = parseConversionFactor(fromUnit.conversionFactor);
    const toFactor = parseConversionFactor(toUnit.conversionFactor);

    if (!isValidConversionFactor(fromFactor) || !isValidConversionFactor(toFactor)) {
      throw new ProductError(
        "INVALID_CONVERSION_FACTOR",
        msg.INVALID_CONVERSION_FACTOR,
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
    context: CurrentBusinessContext,
    fromUnitId: string,
    toUnitId: string,
    value: number
  ): Promise<UnitConversionResultView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const [fromUnit, toUnit] = await Promise.all([
      this.unitRepository.findById(context.businessId, fromUnitId),
      this.unitRepository.findById(context.businessId, toUnitId),
    ]);

    if (!fromUnit || !toUnit) {
      throw new ProductError(
        "UNIT_NOT_FOUND",
        msg.UNIT_NOT_FOUND,
        404
      );
    }

    return this.convert(msg, fromUnit, toUnit, value);
  }
}

export function createUnitConversionService() {
  return new UnitConversionService();
}
