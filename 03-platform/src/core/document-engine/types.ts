/**
 * Purpose:
 * ENG-015 storage types for produced financial documents.
 *
 * Engine:
 * ENG-015 – Document Engine
 */

export type StoreFinancialDocumentInput = {
  businessId: string;
  documentId: string;
  documentType: string;
  referenceId: string;
  payload: Record<string, unknown>;
};

export type StoredFinancialDocument = {
  storageKey: string;
  documentId: string;
  documentType: string;
  storedAt: string;
};
