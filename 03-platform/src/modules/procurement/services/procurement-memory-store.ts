/**
 * Purpose:
 * In-memory procurement store for IP-01 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import type { DocumentNumberingPort } from "@/core/localization-regulatory/document-numbering";
import {
  procurementQualificationStatuses,
  procurementQualificationTypes,
  procurementStatuses,
  procurementSupplierCapabilities,
  procurementSupplierCategories,
} from "@/db/seeds/procurement-catalogues";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ProcurementAuditPort,
  ProcurementCataloguePort,
  ProcurementDocumentPort,
  ProcurementPartyPort,
  ProcurementProfileRepositoryPort,
  SupplierQualificationRepositoryPort,
} from "@/modules/procurement/ports";
import type {
  CatalogueRef,
  ProcurementDocumentRef,
  ProcurementPartyRef,
  ProcurementProfileInsert,
  ProcurementProfilePatch,
  ProcurementProfileRecord,
  SupplierQualificationRecord,
} from "@/modules/procurement/types";

function toCatalogue(
  rows: ReadonlyArray<{
    code: string;
    name: string;
    description: string;
    displayOrder: number;
    isActive: boolean;
  }>
): CatalogueRef[] {
  return rows.map((row) => ({ ...row }));
}

export class InMemoryProcurementStore {
  parties = new Map<string, ProcurementPartyRef>();
  documents = new Map<string, ProcurementDocumentRef>();
  profiles = new Map<string, ProcurementProfileRecord>();
  categories = new Map<string, string[]>();
  capabilities = new Map<string, string[]>();
  qualifications = new Map<string, SupplierQualificationRecord>();
  nextNumber = 1;

  seedParty(party: ProcurementPartyRef) {
    this.parties.set(`${party.businessId}:${party.id}`, party);
  }

  seedDocument(document: ProcurementDocumentRef) {
    this.documents.set(`${document.businessId}:${document.id}`, document);
  }

  partyPort: ProcurementPartyPort = {
    findParty: async (businessId, partyId) =>
      this.parties.get(`${businessId}:${partyId}`) ?? null,
    searchParties: async (businessId, query) => {
      const term = query.trim().toLowerCase();
      return [...this.parties.values()].filter(
        (party) =>
          party.businessId === businessId &&
          (party.displayName.toLowerCase().includes(term) ||
            party.partyNumber.toLowerCase().includes(term))
      );
    },
    assignSupplierRole: async (businessId, partyId) => {
      const party = this.parties.get(`${businessId}:${partyId}`);
      if (!party) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PARTY_NOT_FOUND, undefined, 404);
      }
      this.parties.set(`${businessId}:${partyId}`, {
        ...party,
        hasActiveSupplierRole: true,
      });
    },
  };

  documentPort: ProcurementDocumentPort = {
    findPartyDocument: async (businessId, partyId, documentId) => {
      const row = this.documents.get(`${businessId}:${documentId}`);
      if (!row || row.partyId !== partyId) {
        return null;
      }
      return row;
    },
    listPartyDocuments: async (businessId, partyId) =>
      [...this.documents.values()].filter(
        (row) => row.businessId === businessId && row.partyId === partyId
      ),
  };

  catalogues: ProcurementCataloguePort = {
    listCategories: async () => toCatalogue(procurementSupplierCategories),
    listCapabilities: async () => toCatalogue(procurementSupplierCapabilities),
    listStatuses: async () => toCatalogue(procurementStatuses),
    listQualificationStatuses: async () =>
      toCatalogue(procurementQualificationStatuses),
    listQualificationTypes: async () => toCatalogue(procurementQualificationTypes),
  };

  numbering: DocumentNumberingPort = {
    allocate: async () => {
      const value = this.nextNumber;
      this.nextNumber += 1;
      return {
        number: `SPP-${String(value).padStart(6, "0")}`,
        policyId: "policy-spp",
        policyCode: "PROCUREMENT_PROFILE_DEFAULT",
      };
    },
  };

  profilesPort: ProcurementProfileRepositoryPort = {
    insert: async (values: ProcurementProfileInsert) => {
      for (const existing of this.profiles.values()) {
        if (
          existing.businessId === values.businessId &&
          existing.partyId === values.partyId &&
          !existing.deletedAt
        ) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.DUPLICATE_PROFILE, undefined, 409);
        }
      }
      const now = new Date();
      const row: ProcurementProfileRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: values.deletedAt ?? null,
      };
      this.profiles.set(row.id, row);
      this.categories.set(row.id, []);
      this.capabilities.set(row.id, []);
      return row;
    },
    update: async (businessId, profileId, patch: ProcurementProfilePatch) => {
      const current = this.profiles.get(profileId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
      }
      const next = { ...current, ...patch, updatedAt: new Date() };
      this.profiles.set(profileId, next);
      return next;
    },
    findById: async (businessId, profileId) => {
      const row = this.profiles.get(profileId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
    findByPartyId: async (businessId, partyId) =>
      [...this.profiles.values()].find(
        (row) =>
          row.businessId === businessId && row.partyId === partyId && !row.deletedAt
      ) ?? null,
    listByBusiness: async (businessId) =>
      [...this.profiles.values()].filter(
        (row) => row.businessId === businessId && !row.deletedAt
      ),
    replaceCategories: async (_businessId, profileId, codes) => {
      this.categories.set(profileId, [...codes]);
      return [...codes];
    },
    replaceCapabilities: async (_businessId, profileId, codes) => {
      this.capabilities.set(profileId, [...codes]);
      return [...codes];
    },
    listCategoryCodes: async (profileId) => this.categories.get(profileId) ?? [],
    listCapabilityCodes: async (profileId) => this.capabilities.get(profileId) ?? [],
  };

  qualificationsPort: SupplierQualificationRepositoryPort = {
    insert: async (values) => {
      const now = new Date();
      const row: SupplierQualificationRecord = {
        ...values,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      this.qualifications.set(row.id, row);
      return row;
    },
    update: async (businessId, qualificationId, patch) => {
      const current = this.qualifications.get(qualificationId);
      if (!current || current.businessId !== businessId || current.deletedAt) {
        throw new ProcurementError(
          PROCUREMENT_ERROR_CODES.QUALIFICATION_NOT_FOUND,
          undefined,
          404
        );
      }
      const next = { ...current, ...patch, updatedAt: new Date() };
      this.qualifications.set(qualificationId, next);
      return next;
    },
    listByProfile: async (businessId, profileId) =>
      [...this.qualifications.values()]
        .filter(
          (row) =>
            row.businessId === businessId &&
            row.profileId === profileId &&
            !row.deletedAt
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    findById: async (businessId, qualificationId) => {
      const row = this.qualifications.get(qualificationId);
      if (!row || row.businessId !== businessId || row.deletedAt) {
        return null;
      }
      return row;
    },
  };
}

export function createMemoryNumbering(): DocumentNumberingPort {
  let next = 1;
  return {
    allocate: async () => {
      const value = next;
      next += 1;
      return {
        number: `SPP-${String(value).padStart(6, "0")}`,
        policyId: "policy-spp",
        policyCode: "PROCUREMENT_PROFILE_DEFAULT",
      };
    },
  };
}

export function newId() {
  return randomUUID();
}

export type { ProcurementAuditPort };
