/**
 * Purpose:
 * In-memory purchase-request store for IP-02 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { InProcessWorkflowAdapter } from "@/core/workflow-engine";
import { OVER_BUDGET_MODES } from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  InventoryReorderOriginPort,
  PurchaseRequestControlPort,
  PurchaseRequestRepositoryPort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import type {
  PurchaseRequestControlRecord,
  PurchaseRequestDocumentRecord,
  PurchaseRequestInsert,
  PurchaseRequestLineDraft,
  PurchaseRequestLineRecord,
  PurchaseRequestPatch,
  PurchaseRequestRecord,
  ReorderOriginSnapshot,
  SuggestedSupplierSnapshot,
} from "@/modules/procurement/types";

export class InMemoryPurchaseRequestStore {
  requests = new Map<string, PurchaseRequestRecord>();
  lines = new Map<string, PurchaseRequestLineRecord[]>();
  documents = new Map<string, PurchaseRequestDocumentRecord[]>();
  control: PurchaseRequestControlRecord = {
    businessId: "*",
    requiresApproval: true,
    overBudgetMode: OVER_BUDGET_MODES.BLOCK,
  };
  reorders = new Map<string, ReorderOriginSnapshot>();
  suppliers = new Map<string, SuggestedSupplierSnapshot>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async ({ documentType }) => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      const prefix = documentType === "PURCHASE_REQUEST" ? "PR" : "SPP";
      return {
        number: `${prefix}-${String(value).padStart(6, "0")}`,
        policyId: "policy-pr",
        policyCode: "PURCHASE_REQUEST_DEFAULT",
      };
    },
  };

  workflow(requiresApproval = true) {
    return new InProcessWorkflowAdapter({
      requiresApproval,
      requiresApprovalByOperation: {
        PURCHASE_REQUEST_APPROVAL: requiresApproval,
      },
    });
  }

  controls: PurchaseRequestControlPort = {
    getControl: async (businessId) => ({
      businessId,
      requiresApproval: this.control.requiresApproval,
      overBudgetMode: this.control.overBudgetMode,
    }),
  };

  reorderOrigin: InventoryReorderOriginPort = {
    find: async (businessId, reference) => {
      void businessId;
      return (
        this.reorders.get(reference) ??
        [...this.reorders.values()].find((row) => row.reference === reference) ??
        null
      );
    },
  };

  suggestedSupplier: SuggestedSupplierPort = {
    resolve: async (businessId, profileId) => {
      const row = this.suppliers.get(profileId);
      if (!row || row.profile.businessId !== businessId) {
        return null;
      }
      return row;
    },
  };

  requestsPort: PurchaseRequestRepositoryPort = {
    insert: async (values: PurchaseRequestInsert) => {
      if (values.idempotencyKey) {
        for (const existing of this.requests.values()) {
          if (
            existing.businessId === values.businessId &&
            existing.idempotencyKey === values.idempotencyKey &&
            !existing.deletedAt
          ) {
            return existing;
          }
        }
      }
      const now = new Date();
      const row: PurchaseRequestRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.requests.set(row.id, row);
      this.lines.set(row.id, []);
      this.documents.set(row.id, []);
      return row;
    },
    update: async (businessId, requestId, patch: PurchaseRequestPatch) => {
      const current = this.requests.get(requestId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_FOUND, undefined, 404);
      }
      const next: PurchaseRequestRecord = {
        ...current,
        ...patch,
        version: current.version + 1,
        updatedAt: new Date(),
      };
      this.requests.set(requestId, next);
      return next;
    },
    findById: async (businessId, requestId) => {
      const row = this.requests.get(requestId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    findByIdempotencyKey: async (businessId, idempotencyKey) => {
      for (const row of this.requests.values()) {
        if (
          row.businessId === businessId &&
          row.idempotencyKey === idempotencyKey &&
          !row.deletedAt
        ) {
          return row;
        }
      }
      return null;
    },
    listByBusiness: async (businessId) =>
      [...this.requests.values()]
        .filter((row) => row.businessId === businessId && !row.deletedAt)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    replaceLines: async (businessId, requestId, lines: PurchaseRequestLineDraft[]) => {
      const mapped: PurchaseRequestLineRecord[] = lines.map((line, index) => ({
        id: randomUUID(),
        businessId,
        requestId,
        lineNumber: index + 1,
        catalogueItemId: line.catalogueItemId ?? null,
        description: line.description,
        specification: line.specification ?? null,
        quantity: line.quantity,
        uom: line.uom,
        estimatedValue: line.estimatedValue,
        requiredDate: line.requiredDate ?? null,
      }));
      this.lines.set(requestId, mapped);
      return mapped;
    },
    listLines: async (_businessId, requestId) => this.lines.get(requestId) ?? [],
    addDocument: async (businessId, requestId, document) => {
      const row: PurchaseRequestDocumentRecord = {
        id: randomUUID(),
        businessId,
        requestId,
        documentTypeCode: document.documentTypeCode,
        originalFileName: document.originalFileName,
        storageReference: document.storageReference,
      };
      const existing = this.documents.get(requestId) ?? [];
      existing.push(row);
      this.documents.set(requestId, existing);
      return row;
    },
    listDocuments: async (_businessId, requestId) => this.documents.get(requestId) ?? [],
  };
}
