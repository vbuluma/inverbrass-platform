/**
 * Purpose:
 * In-memory purchase-order store for IP-06 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { InProcessWorkflowAdapter } from "@/core/workflow-engine";
import { PO_VERSION_STATUSES } from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  PurchaseOrderControlPort,
  PurchaseOrderStorePort,
} from "@/modules/procurement/ports";
import type {
  PoLineRecord,
  PoPaymentTermRecord,
  PoSupplierResponseRecord,
  PoSupplierTokenRecord,
  PurchaseOrderControlRecord,
  PurchaseOrderInsert,
  PurchaseOrderPatch,
  PurchaseOrderRecord,
  PurchaseOrderVersionRecord,
} from "@/modules/procurement/types";

export class InMemoryPurchaseOrderStore {
  orders = new Map<string, PurchaseOrderRecord>();
  versions = new Map<string, PurchaseOrderVersionRecord[]>();
  lines = new Map<string, PoLineRecord[]>();
  paymentTerms = new Map<string, PoPaymentTermRecord[]>();
  tokens = new Map<string, PoSupplierTokenRecord>();
  responses = new Map<string, PoSupplierResponseRecord[]>();
  controlByBusiness = new Map<string, PurchaseOrderControlRecord>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async ({ documentType }) => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      const prefix = documentType === "PURCHASE_ORDER" ? "PO" : "DOC";
      return {
        number: `${prefix}-${String(value).padStart(6, "0")}`,
        policyId: "policy-po",
        policyCode: "PURCHASE_ORDER_DEFAULT",
      };
    },
  };

  workflow(requiresApproval = true) {
    return new InProcessWorkflowAdapter({
      requiresApproval,
      requiresApprovalByOperation: {
        PURCHASE_ORDER_APPROVAL: requiresApproval,
      },
    });
  }

  controls: PurchaseOrderControlPort = {
    getControl: async (businessId) => this.controlByBusiness.get(businessId) ?? null,
    getOrCreateControl: async (businessId) => {
      const existing = this.controlByBusiness.get(businessId);
      if (existing) {
        return existing;
      }
      const created: PurchaseOrderControlRecord = {
        businessId,
        requiresApproval: true,
        skipRfxEnabled: false,
        skipRfxMaxAmount: null,
        materialAmendmentThreshold: null,
      };
      this.controlByBusiness.set(businessId, created);
      return created;
    },
  };

  store: PurchaseOrderStorePort = {
    insert: async (values: PurchaseOrderInsert) => {
      const now = new Date();
      const row: PurchaseOrderRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.orders.set(row.id, row);
      this.versions.set(row.id, []);
      return row;
    },
    update: async (businessId, purchaseOrderId, patch: PurchaseOrderPatch) => {
      const current = this.orders.get(purchaseOrderId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_FOUND, undefined, 404);
      }
      const updated: PurchaseOrderRecord = {
        ...current,
        ...patch,
        updatedAt: new Date(),
      };
      this.orders.set(purchaseOrderId, updated);
      return updated;
    },
    findById: async (businessId, purchaseOrderId) => {
      const row = this.orders.get(purchaseOrderId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    findByAwardId: async (businessId, awardId) => {
      for (const row of this.orders.values()) {
        if (
          row.businessId === businessId &&
          row.awardId === awardId &&
          !row.deletedAt
        ) {
          return row;
        }
      }
      return null;
    },
    listByContractId: async (businessId, contractId) =>
      [...this.orders.values()].filter(
        (row) =>
          row.businessId === businessId && row.contractId === contractId && !row.deletedAt
      ),
    findByIssueIdempotencyKey: async (businessId, idempotencyKey) => {
      for (const row of this.orders.values()) {
        if (
          row.businessId === businessId &&
          row.issueIdempotencyKey === idempotencyKey &&
          !row.deletedAt
        ) {
          return row;
        }
      }
      return null;
    },
    listByBusiness: async (businessId) =>
      [...this.orders.values()]
        .filter((row) => row.businessId === businessId && !row.deletedAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    insertVersion: async (values) => {
      const row: PurchaseOrderVersionRecord = {
        ...values,
        createdAt: values.createdAt ?? new Date(),
      };
      const list = this.versions.get(row.purchaseOrderId) ?? [];
      list.push(row);
      this.versions.set(row.purchaseOrderId, list);
      this.lines.set(row.id, []);
      this.paymentTerms.set(row.id, []);
      return row;
    },
    updateVersion: async (businessId, versionId, patch) => {
      for (const list of this.versions.values()) {
        const index = list.findIndex((row) => row.id === versionId);
        if (index >= 0) {
          const current = list[index];
          if (current.businessId !== businessId) {
            throw new ProcurementError(PROCUREMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS, undefined, 403);
          }
          const updated = { ...current, ...patch };
          list[index] = updated;
          return updated;
        }
      }
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID, undefined, 404);
    },
    findVersionById: async (businessId, versionId) => {
      for (const list of this.versions.values()) {
        const row = list.find((item) => item.id === versionId);
        if (row && row.businessId === businessId) {
          return row;
        }
      }
      return null;
    },
    listVersions: async (purchaseOrderId) =>
      [...(this.versions.get(purchaseOrderId) ?? [])].sort(
        (a, b) => a.versionNumber - b.versionNumber
      ),
    insertLines: async (businessId, versionId, lines) => {
      const rows: PoLineRecord[] = lines.map((line) => ({
        id: randomUUID(),
        businessId,
        versionId,
        ...line,
      }));
      this.lines.set(versionId, rows);
      return rows;
    },
    listLines: async (versionId) =>
      [...(this.lines.get(versionId) ?? [])].sort((a, b) => a.sequence - b.sequence),
    insertPaymentTerms: async (businessId, versionId, terms) => {
      const rows: PoPaymentTermRecord[] = terms.map((term) => ({
        id: randomUUID(),
        businessId,
        versionId,
        ...term,
      }));
      this.paymentTerms.set(versionId, rows);
    },
    listPaymentTerms: async (versionId) =>
      [...(this.paymentTerms.get(versionId) ?? [])].sort((a, b) => a.sequence - b.sequence),
    insertSupplierToken: async (values) => {
      const row: PoSupplierTokenRecord = {
        ...values,
        createdAt: values.createdAt ?? new Date(),
      };
      this.tokens.set(row.accessToken, row);
      return row;
    },
    findTokenByAccessToken: async (token) => this.tokens.get(token) ?? null,
    revokeTokensForVersion: async (businessId, versionId, revokedAt) => {
      for (const [key, row] of this.tokens.entries()) {
        if (
          row.businessId === businessId &&
          row.versionId === versionId &&
          !row.revokedAt
        ) {
          this.tokens.set(key, { ...row, revokedAt });
        }
      }
    },
    insertSupplierResponse: async (values) => {
      const row: PoSupplierResponseRecord = {
        ...values,
        createdAt: values.createdAt ?? new Date(),
      };
      const list = this.responses.get(row.purchaseOrderId) ?? [];
      list.push(row);
      this.responses.set(row.purchaseOrderId, list);
      return row;
    },
    findSupplierResponseByIdempotencyKey: async (businessId, idempotencyKey) => {
      for (const list of this.responses.values()) {
        const row = list.find(
          (item) => item.businessId === businessId && item.idempotencyKey === idempotencyKey
        );
        if (row) {
          return row;
        }
      }
      return null;
    },
  };

  seedControl(businessId: string, patch: Partial<PurchaseOrderControlRecord>) {
    this.controlByBusiness.set(businessId, {
      businessId,
      requiresApproval: true,
      skipRfxEnabled: false,
      skipRfxMaxAmount: null,
      materialAmendmentThreshold: null,
      ...patch,
    });
  }
}
