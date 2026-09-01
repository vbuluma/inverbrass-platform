/**
 * Purpose:
 * In-memory receiving store for IP-08 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ReceivingControlPort, ReceivingStorePort } from "@/modules/procurement/ports";
import type {
  ReceiptHandoffRecord,
  ReceiptLineRecord,
  ReceiptRecord,
  ReceivingControlRecord,
} from "@/modules/procurement/types";

export class InMemoryReceivingStore {
  receipts = new Map<string, ReceiptRecord>();
  lines = new Map<string, ReceiptLineRecord[]>();
  handoffs = new Map<string, ReceiptHandoffRecord[]>();
  controlByBusiness = new Map<string, ReceivingControlRecord>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async ({ documentType }) => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      const prefix =
        documentType === "PROCUREMENT_ASSET_RECEIPT"
          ? "AREC"
          : documentType === "PROCUREMENT_SERVICE_CONFIRMATION"
            ? "SVC"
            : "GREC";
      return {
        number: `${prefix}-${String(value).padStart(6, "0")}`,
        policyId: `policy-${documentType}`,
        policyCode: `${documentType}_DEFAULT`,
      };
    },
  };

  controls: ReceivingControlPort = {
    getControl: async (businessId) => this.controlByBusiness.get(businessId) ?? null,
    getOrCreateControl: async (businessId) => {
      const existing = this.controlByBusiness.get(businessId);
      if (existing) {
        return existing;
      }
      const created: ReceivingControlRecord = {
        businessId,
        overReceiptPolicy: "BLOCK",
        requiresSupplierAcceptance: true,
        requiresReceiptConfirmation: false,
      };
      this.controlByBusiness.set(businessId, created);
      return created;
    },
  };

  store: ReceivingStorePort = {
    insertReceipt: async (values) => {
      const now = new Date();
      const row: ReceiptRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.receipts.set(row.id, row);
      this.lines.set(row.id, []);
      this.handoffs.set(row.id, []);
      return row;
    },
    updateReceipt: async (businessId, receiptId, patch) => {
      const current = this.receipts.get(receiptId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND, undefined, 404);
      }
      const updated: ReceiptRecord = { ...current, ...patch, updatedAt: new Date() };
      this.receipts.set(receiptId, updated);
      return updated;
    },
    findReceiptById: async (businessId, receiptId) => {
      const row = this.receipts.get(receiptId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    listReceiptsByBusiness: async (businessId) =>
      [...this.receipts.values()].filter(
        (row) => row.businessId === businessId && !row.deletedAt
      ),
    listReceiptsByPurchaseOrder: async (businessId, purchaseOrderId) =>
      [...this.receipts.values()].filter(
        (row) =>
          row.businessId === businessId &&
          row.purchaseOrderId === purchaseOrderId &&
          !row.deletedAt
      ),
    insertReceiptLines: async (rows) => {
      if (rows.length === 0) {
        return;
      }
      const list = this.lines.get(rows[0]!.receiptId) ?? [];
      list.push(...rows);
      this.lines.set(rows[0]!.receiptId, list);
    },
    listReceiptLines: async (receiptId) => this.lines.get(receiptId) ?? [],
    listReceiptLinesByPoLine: async (poLineId) => {
      const rows: ReceiptLineRecord[] = [];
      for (const list of this.lines.values()) {
        rows.push(...list.filter((row) => row.poLineId === poLineId));
      }
      return rows;
    },
    listConfirmedReceiptLinesByPoLine: async (businessId, poLineId) => {
      const rows: ReceiptLineRecord[] = [];
      for (const [receiptId, list] of this.lines.entries()) {
        const receipt = this.receipts.get(receiptId);
        if (
          !receipt ||
          receipt.businessId !== businessId ||
          receipt.status !== "CONFIRMED" ||
          receipt.deletedAt
        ) {
          continue;
        }
        rows.push(...list.filter((row) => row.poLineId === poLineId));
      }
      return rows;
    },
    insertHandoff: async (values) => {
      const now = new Date();
      const row: ReceiptHandoffRecord = {
        ...values,
        createdAt: values.createdAt ?? now,
        updatedAt: values.updatedAt ?? now,
      };
      const list = this.handoffs.get(row.receiptId) ?? [];
      list.push(row);
      this.handoffs.set(row.receiptId, list);
      return row;
    },
    updateHandoff: async (businessId, handoffId, patch) => {
      for (const [receiptId, list] of this.handoffs.entries()) {
        const index = list.findIndex((row) => row.id === handoffId && row.businessId === businessId);
        if (index >= 0) {
          const updated = { ...list[index]!, ...patch, updatedAt: new Date() };
          list[index] = updated;
          this.handoffs.set(receiptId, list);
          return updated;
        }
      }
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND, undefined, 404);
    },
    findHandoffByIdempotencyKey: async (businessId, idempotencyKey) => {
      for (const list of this.handoffs.values()) {
        const row = list.find(
          (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
        );
        if (row) {
          return row;
        }
      }
      return null;
    },
    listHandoffsByReceipt: async (receiptId) => this.handoffs.get(receiptId) ?? [],
    updateReceiptLine: async (businessId, line) => {
      const list = this.lines.get(line.receiptId) ?? [];
      const index = list.findIndex((row) => row.id === line.id && row.businessId === businessId);
      if (index < 0) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND, undefined, 404);
      }
      list[index] = line;
      this.lines.set(line.receiptId, list);
    },
  };

  seedControl(businessId: string, patch: Partial<ReceivingControlRecord> = {}) {
    this.controlByBusiness.set(businessId, {
      businessId,
      overReceiptPolicy: patch.overReceiptPolicy ?? "BLOCK",
      requiresSupplierAcceptance: patch.requiresSupplierAcceptance ?? true,
      requiresReceiptConfirmation: patch.requiresReceiptConfirmation ?? false,
    });
  }
}
