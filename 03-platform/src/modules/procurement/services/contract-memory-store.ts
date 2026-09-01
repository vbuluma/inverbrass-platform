/**
 * Purpose:
 * In-memory contract store for IP-07 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import { InProcessWorkflowAdapter } from "@/core/workflow-engine";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ContractControlPort, ContractStorePort } from "@/modules/procurement/ports";
import type {
  ContractControlRecord,
  ContractInsert,
  ContractPatch,
  ContractPaymentTermRecord,
  ContractPeriodValueRecord,
  ContractRecord,
  ContractVersionRecord,
} from "@/modules/procurement/types";

export class InMemoryContractStore {
  contracts = new Map<string, ContractRecord>();
  versions = new Map<string, ContractVersionRecord[]>();
  periodValues = new Map<string, ContractPeriodValueRecord[]>();
  paymentTerms = new Map<string, ContractPaymentTermRecord[]>();
  controlByBusiness = new Map<string, ContractControlRecord>();
  nextNumber = 1;

  numbering: DocumentNumberingPort = {
    allocate: async ({ documentType }) => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      const prefix = documentType === "CONTRACT" ? "CTR" : "DOC";
      return {
        number: `${prefix}-${String(value).padStart(6, "0")}`,
        policyId: "policy-contract",
        policyCode: "CONTRACT_DEFAULT",
      };
    },
  };

  workflow(requiresApproval = true) {
    return new InProcessWorkflowAdapter({
      requiresApproval,
      requiresApprovalByOperation: {
        CONTRACT_APPROVAL: requiresApproval,
        CONTRACT_AMENDMENT_APPROVAL: requiresApproval,
      },
    });
  }

  controls: ContractControlPort = {
    getControl: async (businessId) => this.controlByBusiness.get(businessId) ?? null,
    getOrCreateControl: async (businessId) => {
      const existing = this.controlByBusiness.get(businessId);
      if (existing) {
        return existing;
      }
      const created: ContractControlRecord = {
        businessId,
        requiresApproval: true,
        requiresExecutionEvidence: true,
        materialAmendmentThreshold: null,
        expiryWarningDays: 90,
        directContractFromPrEnabled: false,
      };
      this.controlByBusiness.set(businessId, created);
      return created;
    },
  };

  store: ContractStorePort = {
    insert: async (values: ContractInsert) => {
      const now = new Date();
      const row: ContractRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.contracts.set(row.id, row);
      this.versions.set(row.id, []);
      return row;
    },
    update: async (businessId, contractId, patch: ContractPatch) => {
      const current = this.contracts.get(contractId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_NOT_FOUND, undefined, 404);
      }
      const updated: ContractRecord = { ...current, ...patch, updatedAt: new Date() };
      this.contracts.set(contractId, updated);
      return updated;
    },
    findById: async (businessId, contractId) => {
      const row = this.contracts.get(contractId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    findByAwardId: async (businessId, awardId) => {
      for (const row of this.contracts.values()) {
        if (row.businessId === businessId && row.awardId === awardId && !row.deletedAt) {
          return row;
        }
      }
      return null;
    },
    listByBusiness: async (businessId) =>
      [...this.contracts.values()].filter(
        (row) => row.businessId === businessId && !row.deletedAt
      ),
    insertVersion: async (values) => {
      const row: ContractVersionRecord = {
        ...values,
        createdAt: values.createdAt ?? new Date(),
      };
      const list = this.versions.get(row.contractId) ?? [];
      list.push(row);
      this.versions.set(row.contractId, list);
      this.periodValues.set(row.id, []);
      this.paymentTerms.set(row.id, []);
      return row;
    },
    updateVersion: async (businessId, versionId, patch) => {
      for (const [contractId, list] of this.versions.entries()) {
        const index = list.findIndex((row) => row.id === versionId && row.businessId === businessId);
        if (index >= 0) {
          const updated = { ...list[index]!, ...patch };
          list[index] = updated;
          this.versions.set(contractId, list);
          return updated;
        }
      }
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_NOT_FOUND, undefined, 404);
    },
    findVersionById: async (businessId, versionId) => {
      for (const list of this.versions.values()) {
        const row = list.find((item) => item.id === versionId && item.businessId === businessId);
        if (row) {
          return row;
        }
      }
      return null;
    },
    listVersions: async (contractId) => this.versions.get(contractId) ?? [],
    insertPeriodValues: async (businessId, versionId, rows) => {
      const mapped = rows.map((row, index) => ({
        id: randomUUID(),
        businessId,
        versionId,
        periodYear: row.periodYear,
        sequence: row.sequence ?? index + 1,
        amount: row.amount,
        description: row.description ?? null,
      }));
      this.periodValues.set(versionId, mapped);
    },
    listPeriodValues: async (versionId) => this.periodValues.get(versionId) ?? [],
    insertPaymentTerms: async (businessId, versionId, terms) => {
      const mapped: ContractPaymentTermRecord[] = terms.map((term, index) => ({
        id: randomUUID(),
        businessId,
        versionId,
        sequence: term.sequence ?? index + 1,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount ?? null,
        triggerEvent: term.triggerEvent ?? null,
        duePeriodDays: term.duePeriodDays ?? null,
        comments: term.comments ?? null,
      }));
      this.paymentTerms.set(versionId, mapped);
    },
    listPaymentTerms: async (versionId) => this.paymentTerms.get(versionId) ?? [],
  };
}
