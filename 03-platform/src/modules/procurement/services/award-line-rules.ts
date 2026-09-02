/**
 * Purpose:
 * Build authoritative award lines from winning quote lines at award time.
 * Header-only quotes produce a single consolidated award line.
 */

export type QuoteLineInput = {
  id: string;
  sequence: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
};

export type AwardLineDraft = {
  winningQuoteLineId: string | null;
  sequence: number;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
};

export function buildAwardLinesFromQuote(input: {
  quoteLines: QuoteLineInput[];
  headerAmount: string;
  currencyCode: string;
}): AwardLineDraft[] {
  if (input.quoteLines.length > 0) {
    return input.quoteLines.map((line) => ({
      winningQuoteLineId: line.id,
      sequence: line.sequence,
      description: line.description,
      quantity: line.quantity,
      uom: "EA",
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      lineTotal: line.lineTotal,
    }));
  }
  return [
    {
      winningQuoteLineId: null,
      sequence: 1,
      description: "Awarded goods and services",
      quantity: "1",
      uom: "EA",
      unitPrice: input.headerAmount,
      taxRate: "0",
      lineTotal: input.headerAmount,
    },
  ];
}

export function buildSplitAwardLineDrafts(input: {
  lineSequence: number;
  winningQuoteLineId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  lineTotal: string;
}): AwardLineDraft {
  return {
    winningQuoteLineId: input.winningQuoteLineId,
    sequence: input.lineSequence,
    description: input.description,
    quantity: input.quantity,
    uom: "EA",
    unitPrice: input.unitPrice,
    taxRate: input.taxRate,
    lineTotal: input.lineTotal,
  };
}
