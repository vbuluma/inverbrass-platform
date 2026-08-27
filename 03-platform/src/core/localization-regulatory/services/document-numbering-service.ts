/**
 * Purpose:
 * Allocate document numbers from a configured ENG-003b numbering policy.
 * Fails closed when no policy exists.
 *
 * Engine:
 * ENG-003b – Localization & Regulatory Engine
 */

import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DOCUMENT_NUMBERING_ERROR_CODES,
  DocumentNumberingError,
  formatDocumentNumber,
  type AllocatedDocumentNumber,
  type DocumentNumberingPolicy,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";

export type DocumentNumberingStorePort = {
  findActivePolicy(
    businessId: string,
    documentType: string
  ): Promise<DocumentNumberingPolicy | null>;
  allocateNext(policyId: string): Promise<DocumentNumberingPolicy>;
};

export class ConfigurableDocumentNumberingService implements DocumentNumberingPort {
  constructor(private readonly store: DocumentNumberingStorePort) {}

  async allocate(input: {
    businessId: string;
    documentType: string;
  }): Promise<AllocatedDocumentNumber> {
    const policy = await this.store.findActivePolicy(input.businessId, input.documentType);
    if (!policy) {
      throw new DocumentNumberingError(
        DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING,
        "Document numbering is not configured for this business."
      );
    }
    const allocated = await this.store.allocateNext(policy.id);
    return {
      number: formatDocumentNumber(allocated, allocated.nextValue),
      policyId: allocated.id,
      policyCode: allocated.policyCode,
    };
  }
}

export class ScriptedDocumentNumberingAdapter implements DocumentNumberingPort {
  readonly calls: Array<{ businessId: string; documentType: string }> = [];
  failClosed: boolean;
  sequence = 0;
  policyId: string;
  policyCode: string;

  constructor(options?: { failClosed?: boolean }) {
    this.failClosed = options?.failClosed ?? false;
    this.policyId = "numbering-policy-invoice";
    this.policyCode = "INVOICE_DEFAULT";
  }

  async allocate(input: {
    businessId: string;
    documentType: string;
  }): Promise<AllocatedDocumentNumber> {
    this.calls.push(input);
    if (this.failClosed) {
      throw new DocumentNumberingError(
        DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING,
        "Document numbering is not configured for this business."
      );
    }
    this.sequence += 1;
    const prefix =
      input.documentType === DOCUMENT_NUMBERING_DOCUMENT_TYPES.RECEIPT
        ? "POL-RCT"
        : input.documentType === DOCUMENT_NUMBERING_DOCUMENT_TYPES.REFUND
          ? "POL-RF"
          : input.documentType === DOCUMENT_NUMBERING_DOCUMENT_TYPES.PAYMENT_EXCEPTION
            ? "POL-EXC"
            : "POL-INV";
    return {
      number: `${prefix}-${String(this.sequence).padStart(6, "0")}`,
      policyId: `numbering-policy-${input.documentType.toLowerCase()}`,
      policyCode: `${input.documentType}_DEFAULT`,
    };
  }
}

export class InMemoryDocumentNumberingStore implements DocumentNumberingStorePort {
  readonly policies = new Map<string, DocumentNumberingPolicy>();

  seed(policy: DocumentNumberingPolicy) {
    this.policies.set(policy.id, { ...policy });
  }

  async findActivePolicy(businessId: string, documentType: string) {
    const rows = [...this.policies.values()].filter(
      (row) =>
        row.isActive &&
        row.documentType === documentType &&
        (row.businessId === businessId || row.businessId === null)
    );
    return (
      rows.find((row) => row.businessId === businessId) ??
      rows.find((row) => row.businessId === null) ??
      null
    );
  }

  async allocateNext(policyId: string) {
    const row = this.policies.get(policyId);
    if (!row) {
      throw new DocumentNumberingError(
        DOCUMENT_NUMBERING_ERROR_CODES.POLICY_MISSING,
        "Document numbering is not configured for this business."
      );
    }
    const nextValue = row.nextValue + 1;
    const updated = { ...row, nextValue };
    this.policies.set(policyId, updated);
    return updated;
  }
}

export function createScriptedDocumentNumberingAdapter(
  options?: { failClosed?: boolean }
) {
  return new ScriptedDocumentNumberingAdapter(options);
}
