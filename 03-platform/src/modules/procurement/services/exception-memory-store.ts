/**
 * Purpose:
 * In-memory exception store for IP-10 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import { procurementExceptionTypes } from "@/db/seeds/procurement-catalogues";
import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ExceptionControlPort, ExceptionStorePort } from "@/modules/procurement/ports";
import type {
  ExceptionActionRecord,
  ExceptionControlRecord,
  ExceptionLinkRecord,
  ExceptionRecord,
  ExceptionTypeRecord,
} from "@/modules/procurement/types";

export class InMemoryExceptionStore {
  exceptions = new Map<string, ExceptionRecord>();
  links = new Map<string, ExceptionLinkRecord[]>();
  actions = new Map<string, ExceptionActionRecord[]>();
  typesByBusiness = new Map<string, ExceptionTypeRecord[]>();
  controlByBusiness = new Map<string, ExceptionControlRecord>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async () => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      return {
        number: `EXC-${String(value).padStart(6, "0")}`,
        policyId: "policy-PROCUREMENT_EXCEPTION",
        policyCode: "PROCUREMENT_EXCEPTION_DEFAULT",
      };
    },
  };

  controls: ExceptionControlPort = {
    getControl: async (businessId) => this.controlByBusiness.get(businessId) ?? null,
    getOrCreateControl: async (businessId) => {
      const existing = this.controlByBusiness.get(businessId);
      if (existing) {
        return existing;
      }
      const created: ExceptionControlRecord = {
        businessId,
        highSeverityRequiresApproval: true,
        duplicateInvoiceRequiresDecision: true,
        defaultSlaDays: 5,
      };
      this.controlByBusiness.set(businessId, created);
      return created;
    },
  };

  seedControl(businessId: string, patch: Partial<ExceptionControlRecord>) {
    const current = this.controlByBusiness.get(businessId) ?? {
      businessId,
      highSeverityRequiresApproval: true,
      duplicateInvoiceRequiresDecision: true,
      defaultSlaDays: 5,
    };
    this.controlByBusiness.set(businessId, { ...current, ...patch, businessId });
  }

  async ensureTypes(businessId: string) {
    const existing = this.typesByBusiness.get(businessId);
    if (existing?.length) {
      return existing;
    }
    const rows = procurementExceptionTypes.map((row) => ({
      id: randomUUID(),
      businessId,
      code: row.code,
      name: row.name,
      description: row.description,
      defaultSeverity: row.defaultSeverity,
      requiresApprovalOnClose: row.requiresApprovalOnClose,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    }));
    this.typesByBusiness.set(businessId, rows);
    return rows;
  }

  store: ExceptionStorePort = {
    insertException: async (values) => {
      const now = new Date();
      const row: ExceptionRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.exceptions.set(row.id, row);
      this.links.set(row.id, []);
      this.actions.set(row.id, []);
      return row;
    },
    updateException: async (businessId, exceptionId, patch) => {
      const current = this.exceptions.get(exceptionId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_NOT_FOUND, undefined, 404);
      }
      const updated = { ...current, ...patch, updatedAt: new Date() };
      this.exceptions.set(exceptionId, updated);
      return updated;
    },
    findExceptionById: async (businessId, exceptionId) => {
      const row = this.exceptions.get(exceptionId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    findExceptionBySourceKey: async (businessId, sourceKey) => {
      for (const row of this.exceptions.values()) {
        if (row.businessId === businessId && row.sourceKey === sourceKey && !row.deletedAt) {
          return row;
        }
      }
      return null;
    },
    listExceptionsByBusiness: async (businessId) =>
      [...this.exceptions.values()].filter(
        (row) => row.businessId === businessId && !row.deletedAt
      ),
    listExceptionsByObject: async (businessId, objectType, objectId) => {
      const exceptionIds = new Set<string>();
      for (const list of this.links.values()) {
        for (const link of list) {
          if (
            link.businessId === businessId &&
            link.objectType === objectType &&
            link.objectId === objectId
          ) {
            exceptionIds.add(link.exceptionId);
          }
        }
      }
      return [...this.exceptions.values()].filter(
        (row) => exceptionIds.has(row.id) && row.businessId === businessId && !row.deletedAt
      );
    },
    countOpenExceptions: async (businessId) =>
      [...this.exceptions.values()].filter(
        (row) =>
          row.businessId === businessId &&
          !row.deletedAt &&
          row.status !== "CLOSED" &&
          row.status !== "CANCELLED"
      ).length,
    insertLinks: async (rows) => {
      if (rows.length === 0) {
        return;
      }
      const list = this.links.get(rows[0]!.exceptionId) ?? [];
      list.push(...rows);
      this.links.set(rows[0]!.exceptionId, list);
    },
    listLinks: async (exceptionId) => this.links.get(exceptionId) ?? [],
    insertAction: async (values) => {
      const row: ExceptionActionRecord = {
        ...values,
        createdAt: values.createdAt ?? new Date(),
      };
      const list = this.actions.get(row.exceptionId) ?? [];
      list.push(row);
      this.actions.set(row.exceptionId, list);
      return row;
    },
    listActions: async (exceptionId) => this.actions.get(exceptionId) ?? [],
    listTypes: async (businessId) => this.ensureTypes(businessId),
    insertType: async (values) => {
      const list = (await this.ensureTypes(values.businessId)) as ExceptionTypeRecord[];
      const row: ExceptionTypeRecord = { id: randomUUID(), ...values };
      list.push(row);
      this.typesByBusiness.set(values.businessId, list);
      return row;
    },
  };
}

export function createInMemoryExceptionStore() {
  return new InMemoryExceptionStore();
}
