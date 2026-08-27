/**
 * Purpose:
 * ENG-015 storage boundary. BP-007 stores/retrieves handles; it does not
 * implement object storage.
 *
 * Engine:
 * ENG-015 – Document Engine
 */

import type {
  StoreFinancialDocumentInput,
  StoredFinancialDocument,
} from "@/core/document-engine/types";

export type DocumentEnginePort = {
  storeFinancialDocument(
    input: StoreFinancialDocumentInput
  ): Promise<StoredFinancialDocument>;
  retrieveFinancialDocument(
    businessId: string,
    storageKey: string
  ): Promise<StoredFinancialDocument | null>;
};
