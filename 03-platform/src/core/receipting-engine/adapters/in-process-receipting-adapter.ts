/**
 * Purpose:
 * In-process ENG-007 adapter. Records a document handle without PDF
 * or provider HTTP. Delivery belongs to ENG-009.
 *
 * Engine:
 * ENG-007 – Receipting Engine
 */

import type { ReceiptingEnginePort } from "@/core/receipting-engine/ports";
import type {
  FinancialDocumentHandle,
  ProduceFinancialDocumentInput,
} from "@/core/receipting-engine/types";

export class InProcessReceiptingAdapter implements ReceiptingEnginePort {
  readonly produceCalls: ProduceFinancialDocumentInput[] = [];
  readonly documents = new Map<string, FinancialDocumentHandle>();

  async produceFinancialDocument(
    input: ProduceFinancialDocumentInput
  ): Promise<FinancialDocumentHandle> {
    this.produceCalls.push(input);
    const existing = [...this.documents.values()].find(
      (row) => row.documentType === input.documentType && row.documentId.endsWith(input.referenceId)
    );
    const handle: FinancialDocumentHandle = {
      documentId: existing?.documentId ?? `eng007-${input.documentType}-${input.referenceId}`,
      documentType: input.documentType,
      documentState: input.documentState,
      producedAt: new Date().toISOString(),
    };
    this.documents.set(handle.documentId, handle);
    return handle;
  }
}

export function createInProcessReceiptingAdapter() {
  return new InProcessReceiptingAdapter();
}
