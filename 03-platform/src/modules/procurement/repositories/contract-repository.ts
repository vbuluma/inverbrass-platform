/**
 * Purpose:
 * Persist procurement contracts with tenant isolation.
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import {
  procurementContract,
  procurementContractControl,
  procurementContractPaymentTerm,
  procurementContractPeriodValue,
  procurementContractVersion,
} from "@/db/schema/procurement-contract";
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

function mapHeader(row: typeof procurementContract.$inferSelect): ContractRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    contractNumber: row.contractNumber,
    profileId: row.profileId,
    contractTypeCode: row.contractTypeCode,
    title: row.title,
    description: row.description,
    status: row.status,
    sourceType: row.sourceType,
    purchaseRequestId: row.purchaseRequestId,
    sourcingEventId: row.sourcingEventId,
    awardId: row.awardId,
    winningQuoteId: row.winningQuoteId,
    currencyCode: row.currencyCode,
    valueType: row.valueType,
    totalValue: row.totalValue,
    annualValue: row.annualValue,
    callOffCeiling: row.callOffCeiling,
    categoryCode: row.categoryCode,
    ownerUserId: row.ownerUserId,
    ownerName: row.ownerName,
    currentVersionId: row.currentVersionId,
    startDate: row.startDate,
    endDate: row.endDate,
    executionDate: row.executionDate,
    renewalOption: row.renewalOption,
    noticePeriodDays: row.noticePeriodDays,
    callOffsPermitted: row.callOffsPermitted,
    executionEvidenceDocumentId: row.executionEvidenceDocumentId,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectionReason: row.rejectionReason,
    activatedAt: row.activatedAt,
    activatedBy: row.activatedBy,
    suspendedAt: row.suspendedAt,
    suspendedBy: row.suspendedBy,
    suspensionReason: row.suspensionReason,
    terminatedAt: row.terminatedAt,
    terminatedBy: row.terminatedBy,
    terminationReason: row.terminationReason,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    closureReason: row.closureReason,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
  };
}

function mapVersion(row: typeof procurementContractVersion.$inferSelect): ContractVersionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    contractId: row.contractId,
    versionNumber: row.versionNumber,
    status: row.status,
    changeReason: row.changeReason,
    effectiveDate: row.effectiveDate,
    valueType: row.valueType,
    totalValue: row.totalValue,
    annualValue: row.annualValue,
    callOffCeiling: row.callOffCeiling,
    startDate: row.startDate,
    endDate: row.endDate,
    renewalOption: row.renewalOption,
    noticePeriodDays: row.noticePeriodDays,
    callOffsPermitted: row.callOffsPermitted,
    supersededAt: row.supersededAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class ContractRepository implements ContractStorePort {
  constructor(private readonly db = getDb()) {}

  async insert(values: ContractInsert) {
    const [row] = await this.db
      .insert(procurementContract)
      .values({
        id: values.id,
        businessId: values.businessId,
        contractNumber: values.contractNumber,
        profileId: values.profileId,
        contractTypeCode: values.contractTypeCode,
        title: values.title,
        description: values.description,
        status: values.status,
        sourceType: values.sourceType,
        purchaseRequestId: values.purchaseRequestId,
        sourcingEventId: values.sourcingEventId,
        awardId: values.awardId,
        winningQuoteId: values.winningQuoteId,
        currencyCode: values.currencyCode,
        valueType: values.valueType,
        totalValue: values.totalValue,
        annualValue: values.annualValue,
        callOffCeiling: values.callOffCeiling,
        categoryCode: values.categoryCode,
        ownerUserId: values.ownerUserId,
        ownerName: values.ownerName,
        currentVersionId: values.currentVersionId,
        startDate: values.startDate,
        endDate: values.endDate,
        executionDate: values.executionDate,
        renewalOption: values.renewalOption,
        noticePeriodDays: values.noticePeriodDays,
        callOffsPermitted: values.callOffsPermitted,
        executionEvidenceDocumentId: values.executionEvidenceDocumentId,
        submittedAt: values.submittedAt,
        submittedBy: values.submittedBy,
        approvedAt: values.approvedAt,
        approvedBy: values.approvedBy,
        rejectedAt: values.rejectedAt,
        rejectedBy: values.rejectedBy,
        rejectionReason: values.rejectionReason,
        activatedAt: values.activatedAt,
        activatedBy: values.activatedBy,
        suspendedAt: values.suspendedAt,
        suspendedBy: values.suspendedBy,
        suspensionReason: values.suspensionReason,
        terminatedAt: values.terminatedAt,
        terminatedBy: values.terminatedBy,
        terminationReason: values.terminationReason,
        closedAt: values.closedAt,
        closedBy: values.closedBy,
        closureReason: values.closureReason,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        deletedAt: values.deletedAt ?? null,
      })
      .returning();
    return mapHeader(row!);
  }

  async update(businessId: string, contractId: string, patch: ContractPatch) {
    const [row] = await this.db
      .update(procurementContract)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(procurementContract.businessId, businessId),
          eq(procurementContract.id, contractId),
          isNull(procurementContract.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_NOT_FOUND, undefined, 404);
    }
    return mapHeader(row);
  }

  async findById(businessId: string, contractId: string) {
    const [row] = await this.db
      .select()
      .from(procurementContract)
      .where(
        and(
          eq(procurementContract.businessId, businessId),
          eq(procurementContract.id, contractId),
          isNull(procurementContract.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async findByAwardId(businessId: string, awardId: string) {
    const [row] = await this.db
      .select()
      .from(procurementContract)
      .where(
        and(
          eq(procurementContract.businessId, businessId),
          eq(procurementContract.awardId, awardId),
          isNull(procurementContract.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(procurementContract)
      .where(
        and(eq(procurementContract.businessId, businessId), isNull(procurementContract.deletedAt))
      )
      .orderBy(desc(procurementContract.createdAt));
    return rows.map(mapHeader);
  }

  async insertVersion(values: Omit<ContractVersionRecord, "createdAt"> & { createdAt?: Date }) {
    const [row] = await this.db
      .insert(procurementContractVersion)
      .values({
        id: values.id,
        businessId: values.businessId,
        contractId: values.contractId,
        versionNumber: values.versionNumber,
        status: values.status,
        changeReason: values.changeReason,
        effectiveDate: values.effectiveDate,
        valueType: values.valueType,
        totalValue: values.totalValue,
        annualValue: values.annualValue,
        callOffCeiling: values.callOffCeiling,
        startDate: values.startDate,
        endDate: values.endDate,
        renewalOption: values.renewalOption,
        noticePeriodDays: values.noticePeriodDays,
        callOffsPermitted: values.callOffsPermitted,
        supersededAt: values.supersededAt,
        createdBy: values.createdBy,
      })
      .returning();
    return mapVersion(row!);
  }

  async updateVersion(
    businessId: string,
    versionId: string,
    patch: Partial<Omit<ContractVersionRecord, "id" | "businessId" | "contractId">>
  ) {
    const [row] = await this.db
      .update(procurementContractVersion)
      .set(patch)
      .where(
        and(
          eq(procurementContractVersion.businessId, businessId),
          eq(procurementContractVersion.id, versionId)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONTRACT_NOT_FOUND, undefined, 404);
    }
    return mapVersion(row);
  }

  async findVersionById(businessId: string, versionId: string) {
    const [row] = await this.db
      .select()
      .from(procurementContractVersion)
      .where(
        and(
          eq(procurementContractVersion.businessId, businessId),
          eq(procurementContractVersion.id, versionId)
        )
      )
      .limit(1);
    return row ? mapVersion(row) : null;
  }

  async listVersions(contractId: string) {
    const rows = await this.db
      .select()
      .from(procurementContractVersion)
      .where(eq(procurementContractVersion.contractId, contractId))
      .orderBy(asc(procurementContractVersion.versionNumber));
    return rows.map(mapVersion);
  }

  async insertPeriodValues(
    businessId: string,
    versionId: string,
    rows: Array<Omit<ContractPeriodValueRecord, "id" | "businessId" | "versionId">>
  ) {
    if (rows.length === 0) {
      return;
    }
    await this.db.insert(procurementContractPeriodValue).values(
      rows.map((row) => ({
        id: randomUUID(),
        businessId,
        versionId,
        periodYear: row.periodYear,
        sequence: row.sequence,
        amount: row.amount,
        description: row.description,
      }))
    );
  }

  async listPeriodValues(versionId: string) {
    const rows = await this.db
      .select()
      .from(procurementContractPeriodValue)
      .where(eq(procurementContractPeriodValue.versionId, versionId))
      .orderBy(asc(procurementContractPeriodValue.sequence));
    return rows.map(
      (row): ContractPeriodValueRecord => ({
        id: row.id,
        businessId: row.businessId,
        versionId: row.versionId,
        periodYear: row.periodYear,
        sequence: row.sequence,
        amount: row.amount,
        description: row.description,
      })
    );
  }

  async insertPaymentTerms(
    businessId: string,
    versionId: string,
    terms: Array<Omit<ContractPaymentTermRecord, "id" | "businessId" | "versionId">>
  ) {
    if (terms.length === 0) {
      return;
    }
    await this.db.insert(procurementContractPaymentTerm).values(
      terms.map((term) => ({
        id: randomUUID(),
        businessId,
        versionId,
        sequence: term.sequence,
        milestoneName: term.milestoneName,
        percentage: term.percentage,
        amount: term.amount,
        triggerEvent: term.triggerEvent,
        duePeriodDays: term.duePeriodDays,
        comments: term.comments,
      }))
    );
  }

  async listPaymentTerms(versionId: string) {
    const rows = await this.db
      .select()
      .from(procurementContractPaymentTerm)
      .where(eq(procurementContractPaymentTerm.versionId, versionId))
      .orderBy(asc(procurementContractPaymentTerm.sequence));
    return rows.map(
      (row): ContractPaymentTermRecord => ({
        id: row.id,
        businessId: row.businessId,
        versionId: row.versionId,
        sequence: row.sequence,
        milestoneName: row.milestoneName,
        percentage: row.percentage,
        amount: row.amount,
        triggerEvent: row.triggerEvent,
        duePeriodDays: row.duePeriodDays,
        comments: row.comments,
      })
    );
  }
}

export class ContractControlRepository implements ContractControlPort {
  constructor(private readonly db = getDb()) {}

  async getControl(businessId: string): Promise<ContractControlRecord | null> {
    const [row] = await this.db
      .select()
      .from(procurementContractControl)
      .where(eq(procurementContractControl.businessId, businessId))
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      businessId: row.businessId,
      requiresApproval: row.requiresApproval,
      requiresExecutionEvidence: row.requiresExecutionEvidence,
      materialAmendmentThreshold: row.materialAmendmentThreshold,
      expiryWarningDays: row.expiryWarningDays,
      directContractFromPrEnabled: row.directContractFromPrEnabled,
    };
  }

  async getOrCreateControl(businessId: string): Promise<ContractControlRecord> {
    const existing = await this.getControl(businessId);
    if (existing) {
      return existing;
    }
    const [row] = await this.db
      .insert(procurementContractControl)
      .values({ businessId })
      .returning();
    return {
      businessId: row!.businessId,
      requiresApproval: row!.requiresApproval,
      requiresExecutionEvidence: row!.requiresExecutionEvidence,
      materialAmendmentThreshold: row!.materialAmendmentThreshold,
      expiryWarningDays: row!.expiryWarningDays,
      directContractFromPrEnabled: row!.directContractFromPrEnabled,
    };
  }
}

export function createContractRepository() {
  return new ContractRepository();
}

export function createContractControlRepository() {
  return new ContractControlRepository();
}
