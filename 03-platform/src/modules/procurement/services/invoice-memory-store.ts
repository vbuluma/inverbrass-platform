/**
 * Purpose:
 * In-memory invoice store for IP-09 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { InvoiceControlPort, InvoiceStorePort } from "@/modules/procurement/ports";
import type {
  ApHandoffRecord,
  InvoiceControlRecord,
  InvoiceMatchLineRecord,
  InvoiceMatchRecord,
  SupplierInvoiceLineRecord,
  SupplierInvoiceRecord,
} from "@/modules/procurement/types";

export class InMemoryInvoiceStore {
  invoices = new Map<string, SupplierInvoiceRecord>();
  lines = new Map<string, SupplierInvoiceLineRecord[]>();
  matches = new Map<string, InvoiceMatchRecord[]>();
  matchLines = new Map<string, InvoiceMatchLineRecord[]>();
  handoffs = new Map<string, ApHandoffRecord>();
  controlByBusiness = new Map<string, InvoiceControlRecord>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async () => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      return {
        number: `SINV-${String(value).padStart(6, "0")}`,
        policyId: "policy-PROCUREMENT_SUPPLIER_INVOICE",
        policyCode: "PROCUREMENT_SUPPLIER_INVOICE_DEFAULT",
      };
    },
  };

  controls: InvoiceControlPort = {
    getControl: async (businessId) => this.controlByBusiness.get(businessId) ?? null,
    getOrCreateControl: async (businessId) => {
      const existing = this.controlByBusiness.get(businessId);
      if (existing) {
        return existing;
      }
      const created: InvoiceControlRecord = {
        businessId,
        defaultMatchingMode: "THREE_WAY",
        priceTolerancePercent: "2",
        quantityTolerancePercent: "1",
        taxToleranceAmount: "0.01",
        duplicatePolicy: "BLOCK",
        duplicateCheckAmountDate: false,
        allowNonPoInvoices: false,
        requireReceiptForInventory: true,
        requireReceiptForAssets: true,
        requireReceiptForServices: false,
        allowBlacklistedPaymentReady: false,
      };
      this.controlByBusiness.set(businessId, created);
      return created;
    },
  };

  seedControl(businessId: string, patch: Partial<InvoiceControlRecord>) {
    const current = this.controlByBusiness.get(businessId) ?? {
      businessId,
      defaultMatchingMode: "THREE_WAY",
      priceTolerancePercent: "2",
      quantityTolerancePercent: "1",
      taxToleranceAmount: "0.01",
      duplicatePolicy: "BLOCK",
      duplicateCheckAmountDate: false,
      allowNonPoInvoices: false,
      requireReceiptForInventory: true,
      requireReceiptForAssets: true,
      requireReceiptForServices: false,
      allowBlacklistedPaymentReady: false,
    };
    this.controlByBusiness.set(businessId, { ...current, ...patch, businessId });
  }

  store: InvoiceStorePort = {
    insertInvoice: async (values) => {
      const now = new Date();
      const row: SupplierInvoiceRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.invoices.set(row.id, row);
      this.lines.set(row.id, []);
      this.matches.set(row.id, []);
      return row;
    },
    updateInvoice: async (businessId, invoiceId, patch) => {
      const current = this.invoices.get(invoiceId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_NOT_FOUND, undefined, 404);
      }
      const updated: SupplierInvoiceRecord = { ...current, ...patch, updatedAt: new Date() };
      this.invoices.set(invoiceId, updated);
      return updated;
    },
    findInvoiceById: async (businessId, invoiceId) => {
      const row = this.invoices.get(invoiceId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    listInvoicesByBusiness: async (businessId) =>
      [...this.invoices.values()].filter(
        (row) => row.businessId === businessId && !row.deletedAt
      ),
    listInvoicesByPurchaseOrder: async (businessId, purchaseOrderId) =>
      [...this.invoices.values()].filter(
        (row) =>
          row.businessId === businessId &&
          row.purchaseOrderId === purchaseOrderId &&
          !row.deletedAt
      ),
    findDuplicateInvoice: async (businessId, profileId, supplierInvoiceNumber, excludeInvoiceId) =>
      [...this.invoices.values()].find(
        (row) =>
          row.businessId === businessId &&
          row.profileId === profileId &&
          row.supplierInvoiceNumber.trim().toLowerCase() ===
            supplierInvoiceNumber.trim().toLowerCase() &&
          !row.deletedAt &&
          row.id !== excludeInvoiceId
      ) ?? null,
    insertInvoiceLines: async (rows) => {
      if (rows.length === 0) {
        return;
      }
      const list = this.lines.get(rows[0]!.invoiceId) ?? [];
      list.push(...rows);
      this.lines.set(rows[0]!.invoiceId, list);
    },
    listInvoiceLines: async (invoiceId) => this.lines.get(invoiceId) ?? [],
    replaceInvoiceLines: async (_businessId, invoiceId, rows) => {
      this.lines.set(invoiceId, rows);
    },
    insertMatch: async (values) => {
      const row: InvoiceMatchRecord = {
        ...values,
        createdAt: values.createdAt ?? new Date(),
      };
      const list = this.matches.get(row.invoiceId) ?? [];
      list.push(row);
      this.matches.set(row.invoiceId, list);
      this.matchLines.set(row.id, []);
      return row;
    },
    findMatchByIdempotencyKey: async (businessId, idempotencyKey) => {
      for (const list of this.matches.values()) {
        const found = list.find(
          (row) => row.businessId === businessId && row.idempotencyKey === idempotencyKey
        );
        if (found) {
          return found;
        }
      }
      return null;
    },
    listMatchesByInvoice: async (invoiceId) => this.matches.get(invoiceId) ?? [],
    insertMatchLines: async (rows) => {
      if (rows.length === 0) {
        return;
      }
      const list = this.matchLines.get(rows[0]!.matchId) ?? [];
      list.push(...rows);
      this.matchLines.set(rows[0]!.matchId, list);
    },
    listMatchLines: async (matchId) => this.matchLines.get(matchId) ?? [],
    insertApHandoff: async (values) => {
      const now = new Date();
      const row: ApHandoffRecord = {
        ...values,
        createdAt: values.createdAt ?? now,
        updatedAt: values.updatedAt ?? now,
      };
      this.handoffs.set(row.invoiceId, row);
      return row;
    },
    updateApHandoff: async (businessId, handoffId, patch) => {
      for (const [invoiceId, row] of this.handoffs.entries()) {
        if (row.id === handoffId && row.businessId === businessId) {
          const updated = { ...row, ...patch, updatedAt: new Date() };
          this.handoffs.set(invoiceId, updated);
          return updated;
        }
      }
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.HANDOFF_FAILED, undefined, 404);
    },
    findApHandoffByIdempotencyKey: async (businessId, idempotencyKey) =>
      [...this.handoffs.values()].find(
        (row) => row.businessId === businessId && row.idempotencyKey === idempotencyKey
      ) ?? null,
    findApHandoffByInvoice: async (businessId, invoiceId) => {
      const row = this.handoffs.get(invoiceId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return row;
    },
    listPaymentReadyInvoices: async (businessId) =>
      [...this.invoices.values()].filter(
        (row) =>
          row.businessId === businessId &&
          !row.deletedAt &&
          (row.status === "PAYMENT_READY" || row.status === "APPROVED")
      ),
  };
}

export function createInMemoryInvoiceStore() {
  return new InMemoryInvoiceStore();
}
