/**
 * Purpose:
 * ENG-003b document numbering policy. Callers must not invent local numbers.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

export const DOCUMENT_NUMBERING_DOCUMENT_TYPES = {
  INVOICE: "INVOICE",
  RECEIPT: "RECEIPT",
  REFUND: "REFUND",
  PAYMENT_EXCEPTION: "PAYMENT_EXCEPTION",
  STOCK_RECEIPT: "STOCK_RECEIPT",
  OPENING_BALANCE: "OPENING_BALANCE",
  STOCK_RESERVATION: "STOCK_RESERVATION",
  STOCK_ADJUSTMENT: "STOCK_ADJUSTMENT",
  STOCKTAKE: "STOCKTAKE",
  STOCK_CONTROL_ADVICE: "STOCK_CONTROL_ADVICE",
  INVENTORY_EXCEPTION: "INVENTORY_EXCEPTION",
  STOCK_TRANSFER: "STOCK_TRANSFER",
} as const;

export type DocumentNumberingDocumentType =
  (typeof DOCUMENT_NUMBERING_DOCUMENT_TYPES)[keyof typeof DOCUMENT_NUMBERING_DOCUMENT_TYPES];

export type DocumentNumberingPolicy = {
  id: string;
  businessId: string | null;
  documentType: string;
  policyCode: string;
  prefix: string;
  nextValue: number;
  padding: number;
  isActive: boolean;
};

export type AllocatedDocumentNumber = {
  number: string;
  policyId: string;
  policyCode: string;
};

export type DocumentNumberingPort = {
  allocate(input: {
    businessId: string;
    documentType: DocumentNumberingDocumentType | string;
  }): Promise<AllocatedDocumentNumber>;
};

export class DocumentNumberingError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DocumentNumberingError";
    this.code = code;
  }
}

export const DOCUMENT_NUMBERING_ERROR_CODES = {
  POLICY_MISSING: "NUMBERING_POLICY_MISSING",
} as const;

export function formatDocumentNumber(policy: DocumentNumberingPolicy, value: number): string {
  const width = policy.padding > 0 ? policy.padding : 6;
  return `${policy.prefix}-${String(value).padStart(width, "0")}`;
}
