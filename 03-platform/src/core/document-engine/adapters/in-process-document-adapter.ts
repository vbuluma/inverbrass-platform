/**
 * Purpose:
 * In-process ENG-015 adapter. Records stored document handles without
 * object-storage SDKs or provider HTTP.
 *
 * Engine:
 * ENG-015 – Document Engine
 */

import type { DocumentEnginePort } from "@/core/document-engine/ports";
import type {
  StoreFinancialDocumentInput,
  StoredFinancialDocument,
} from "@/core/document-engine/types";

export class InProcessDocumentAdapter implements DocumentEnginePort {
  readonly storeCalls: StoreFinancialDocumentInput[] = [];
  readonly documents = new Map<string, StoredFinancialDocument>();

  async storeFinancialDocument(
    input: StoreFinancialDocumentInput
  ): Promise<StoredFinancialDocument> {
    this.storeCalls.push(input);
    const stored: StoredFinancialDocument = {
      storageKey: `eng015:${input.businessId}:${input.documentId}`,
      documentId: input.documentId,
      documentType: input.documentType,
      storedAt: new Date().toISOString(),
    };
    this.documents.set(`${input.businessId}:${stored.storageKey}`, stored);
    return stored;
  }

  async retrieveFinancialDocument(businessId: string, storageKey: string) {
    return this.documents.get(`${businessId}:${storageKey}`) ?? null;
  }
}

export function createInProcessDocumentAdapter() {
  return new InProcessDocumentAdapter();
}
