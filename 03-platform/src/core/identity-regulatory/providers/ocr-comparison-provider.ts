/**
 * Purpose:
 * OCR comparison abstraction — future OCR-assisted identifier validation.
 *
 * Engine:
 * ENG-003j – Identity & Regulatory Identification Engine
 *
 * Note:
 * Interface only — no OCR implementation in IP-013.
 */

import type { OcrComparisonResult } from "@/core/identity-regulatory/types";

export type OcrComparisonInput = {
  identifierId: string;
  documentId: string;
  enteredValue: string;
  extractedValue: string;
};

export interface OcrComparisonProvider {
  compare(input: OcrComparisonInput): Promise<OcrComparisonResult>;
}

/** Placeholder provider — returns inconclusive until OCR is implemented. */
export class NoOpOcrComparisonProvider implements OcrComparisonProvider {
  async compare(input: OcrComparisonInput): Promise<OcrComparisonResult> {
    return {
      identifierId: input.identifierId,
      documentId: input.documentId,
      extractedValue: input.extractedValue,
      enteredValue: input.enteredValue,
      outcome: "INCONCLUSIVE",
      comparedAt: new Date().toISOString(),
    };
  }
}

export function createNoOpOcrComparisonProvider(): OcrComparisonProvider {
  return new NoOpOcrComparisonProvider();
}
