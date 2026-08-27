/**
 * Purpose:
 * ENG-007 production boundary. BP-007 requests documents; it does not
 * implement a second document engine.
 *
 * Engine:
 * ENG-007 – Receipting Engine
 */

import type {
  FinancialDocumentHandle,
  ProduceFinancialDocumentInput,
} from "@/core/receipting-engine/types";

export type ReceiptingEnginePort = {
  produceFinancialDocument(
    input: ProduceFinancialDocumentInput
  ): Promise<FinancialDocumentHandle>;
};
