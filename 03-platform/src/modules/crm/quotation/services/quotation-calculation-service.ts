/**
 * Purpose:
 * Quotation total calculations — line totals, taxes, discounts, grand totals.
 *
 * Architecture:
 * QuotationService → QuotationCalculationService (no BP-003 dependency)
 *
 * Design rationale:
 * Accepts already-resolved unit prices. Does not fetch pricing from BP-003.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.2)
 */

import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import {
  calculateLineDiscountAmount,
  calculateLineSubtotal,
  calculateLineTaxAmount,
  calculateLineTotal,
  roundMoney,
  sumMoney,
} from "@/modules/crm/quotation/services/quotation-calculation-rules";
import type {
  QuotationCalculationOptions,
  QuotationLineCalculationInput,
  QuotationLineCalculationResult,
  QuotationTotalsCalculationResult,
} from "@/modules/crm/quotation/types";

export class QuotationCalculationService {
  calculateLine(input: QuotationLineCalculationInput): QuotationLineCalculationResult {
    this.assertValidLineInput(input);

    const lineSubtotal = calculateLineSubtotal(input.quantity, input.unitPrice);
    const discountAmount = calculateLineDiscountAmount(
      lineSubtotal,
      input.discountPercent,
      input.discountAmount
    );
    const taxableAmount = roundMoney(lineSubtotal - discountAmount);
    const taxAmount = calculateLineTaxAmount(
      taxableAmount,
      input.taxRatePercent
    );
    const lineTotal = calculateLineTotal(
      lineSubtotal,
      discountAmount,
      taxAmount
    );

    return {
      lineNumber: input.lineNumber,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      lineSubtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  }

  calculateTotals(
    lines: QuotationLineCalculationInput[],
    options: QuotationCalculationOptions = {}
  ): QuotationTotalsCalculationResult {
    if (lines.length === 0) {
      throw new CrmError(
        "QUOTATION_LINE_REQUIRED",
        CRM_USER_MESSAGES.QUOTATION_LINE_REQUIRED,
        400
      );
    }

    const calculatedLines = lines.map((line) => this.calculateLine(line));

    const subtotal = sumMoney(
      calculatedLines.map((line) => line.lineSubtotal)
    );
    const lineDiscountTotal = sumMoney(
      calculatedLines.map((line) => line.discountAmount)
    );
    const lineTaxTotal = sumMoney(
      calculatedLines.map((line) => line.taxAmount)
    );

    const netAfterLineDiscounts = roundMoney(subtotal - lineDiscountTotal);

    const documentDiscount = calculateLineDiscountAmount(
      netAfterLineDiscounts,
      options.documentDiscountPercent,
      options.documentDiscountAmount
    );

    const taxableBase = roundMoney(netAfterLineDiscounts - documentDiscount);
    const documentTax = calculateLineTaxAmount(
      taxableBase,
      options.documentTaxRatePercent
    );

    const discountTotal = roundMoney(lineDiscountTotal + documentDiscount);
    const taxTotal = roundMoney(lineTaxTotal + documentTax);
    const grandTotal = roundMoney(taxableBase + documentTax);

    return {
      lines: calculatedLines,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
    };
  }

  /** Maps calculation output to persisted numeric string fields. */
  toPersistedTotals(totals: QuotationTotalsCalculationResult): {
    subtotal: string;
    taxAmount: string;
    grandTotal: string;
  } {
    return {
      subtotal: totals.subtotal.toFixed(6),
      taxAmount: totals.taxTotal.toFixed(6),
      grandTotal: totals.grandTotal.toFixed(6),
    };
  }

  private assertValidLineInput(input: QuotationLineCalculationInput): void {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new CrmError(
        "INVALID_LINE_QUANTITY",
        CRM_USER_MESSAGES.INVALID_LINE_QUANTITY,
        400
      );
    }

    if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
      throw new CrmError(
        "INVALID_LINE_PRICE",
        CRM_USER_MESSAGES.INVALID_LINE_PRICE,
        400
      );
    }
  }
}

export function createQuotationCalculationService() {
  return new QuotationCalculationService();
}
