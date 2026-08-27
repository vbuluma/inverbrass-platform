/**
 * Purpose:
 * ENG-007 financial-document production types. Not a PDF renderer.
 *
 * Engine:
 * ENG-007 – Receipting Engine
 */

export type ProduceFinancialDocumentInput = {
  businessId: string;
  documentType: string;
  documentState: string;
  referenceId: string;
  currencyCode: string;
  amount: string;
  payload: Record<string, unknown>;
};

export type FinancialDocumentHandle = {
  documentId: string;
  documentType: string;
  documentState: string;
  producedAt: string;
};
