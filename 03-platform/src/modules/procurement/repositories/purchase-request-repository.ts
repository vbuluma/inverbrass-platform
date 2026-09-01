/**
 * Purpose:
 * Persist purchase requests with tenant isolation. Soft-delete only.
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import {
  procurementPurchaseRequest,
  procurementPurchaseRequestLine,
  procurementRequestControl,
  procurementRequestDocument,
} from "@/db/schema/procurement-purchase-request";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  PurchaseRequestControlPort,
  PurchaseRequestRepositoryPort,
} from "@/modules/procurement/ports";
import type {
  PurchaseRequestControlRecord,
  PurchaseRequestDocumentRecord,
  PurchaseRequestInsert,
  PurchaseRequestLineDraft,
  PurchaseRequestLineRecord,
  PurchaseRequestPatch,
  PurchaseRequestRecord,
} from "@/modules/procurement/types";

function mapHeader(row: typeof procurementPurchaseRequest.$inferSelect): PurchaseRequestRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    requestNumber: row.requestNumber,
    status: row.status,
    originType: row.originType,
    originReference: row.originReference,
    requesterUserId: row.requesterUserId,
    businessUnitCode: row.businessUnitCode,
    procurementType: row.procurementType,
    justification: row.justification,
    requiredDate: row.requiredDate,
    deliveryLocation: row.deliveryLocation,
    estimatedValue: row.estimatedValue,
    currencyCode: row.currencyCode,
    budgetSource: row.budgetSource,
    budgetReference: row.budgetReference,
    budgetLine: row.budgetLine,
    budgetPeriod: row.budgetPeriod,
    budgetApprovedAmount: row.budgetApprovedAmount,
    budgetAvailableAmount: row.budgetAvailableAmount,
    budgetCheckStatus: row.budgetCheckStatus,
    budgetApprovalReference: row.budgetApprovalReference,
    budgetApprovalDate: row.budgetApprovalDate,
    budgetApprover: row.budgetApprover,
    suggestedProfileId: row.suggestedProfileId,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    returnedAt: row.returnedAt,
    returnedBy: row.returnedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    decisionReason: row.decisionReason,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    version: row.version,
  };
}

function mapLine(row: typeof procurementPurchaseRequestLine.$inferSelect): PurchaseRequestLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    requestId: row.requestId,
    lineNumber: row.lineNumber,
    catalogueItemId: row.catalogueItemId,
    description: row.description,
    specification: row.specification,
    quantity: row.quantity,
    uom: row.uom,
    estimatedValue: row.estimatedValue,
    requiredDate: row.requiredDate,
  };
}

function mapDocument(
  row: typeof procurementRequestDocument.$inferSelect
): PurchaseRequestDocumentRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    requestId: row.requestId,
    documentTypeCode: row.documentTypeCode,
    originalFileName: row.originalFileName,
    storageReference: row.storageReference,
  };
}

export class PurchaseRequestRepository implements PurchaseRequestRepositoryPort {
  constructor(private readonly db = getDb()) {}

  async insert(values: PurchaseRequestInsert) {
    const [row] = await this.db
      .insert(procurementPurchaseRequest)
      .values({
        id: values.id,
        businessId: values.businessId,
        requestNumber: values.requestNumber,
        status: values.status,
        originType: values.originType,
        originReference: values.originReference,
        requesterUserId: values.requesterUserId,
        businessUnitCode: values.businessUnitCode,
        procurementType: values.procurementType,
        justification: values.justification,
        requiredDate: values.requiredDate,
        deliveryLocation: values.deliveryLocation,
        estimatedValue: values.estimatedValue,
        currencyCode: values.currencyCode,
        budgetSource: values.budgetSource,
        budgetReference: values.budgetReference,
        budgetLine: values.budgetLine,
        budgetPeriod: values.budgetPeriod,
        budgetApprovedAmount: values.budgetApprovedAmount,
        budgetAvailableAmount: values.budgetAvailableAmount,
        budgetCheckStatus: values.budgetCheckStatus,
        budgetApprovalReference: values.budgetApprovalReference,
        budgetApprovalDate: values.budgetApprovalDate,
        budgetApprover: values.budgetApprover,
        suggestedProfileId: values.suggestedProfileId,
        submittedAt: values.submittedAt,
        submittedBy: values.submittedBy,
        approvedAt: values.approvedAt,
        approvedBy: values.approvedBy,
        rejectedAt: values.rejectedAt,
        rejectedBy: values.rejectedBy,
        returnedAt: values.returnedAt,
        returnedBy: values.returnedBy,
        cancelledAt: values.cancelledAt,
        cancelledBy: values.cancelledBy,
        decisionReason: values.decisionReason,
        idempotencyKey: values.idempotencyKey,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        version: values.version,
      })
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapHeader(row);
  }

  async update(businessId: string, requestId: string, patch: PurchaseRequestPatch) {
    const current = await this.findById(businessId, requestId);
    if (!current) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_FOUND, undefined, 404);
    }
    const [row] = await this.db
      .update(procurementPurchaseRequest)
      .set({
        ...patch,
        version: current.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementPurchaseRequest.id, requestId),
          eq(procurementPurchaseRequest.businessId, businessId),
          eq(procurementPurchaseRequest.version, current.version),
          isNull(procurementPurchaseRequest.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CONCURRENT_UPDATE, undefined, 409);
    }
    return mapHeader(row);
  }

  async findById(businessId: string, requestId: string) {
    const [row] = await this.db
      .select()
      .from(procurementPurchaseRequest)
      .where(
        and(
          eq(procurementPurchaseRequest.id, requestId),
          eq(procurementPurchaseRequest.businessId, businessId),
          isNull(procurementPurchaseRequest.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(procurementPurchaseRequest)
      .where(
        and(
          eq(procurementPurchaseRequest.businessId, businessId),
          eq(procurementPurchaseRequest.idempotencyKey, idempotencyKey),
          isNull(procurementPurchaseRequest.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(procurementPurchaseRequest)
      .where(
        and(
          eq(procurementPurchaseRequest.businessId, businessId),
          isNull(procurementPurchaseRequest.deletedAt)
        )
      )
      .orderBy(desc(procurementPurchaseRequest.createdAt));
    return rows.map(mapHeader);
  }

  async replaceLines(
    businessId: string,
    requestId: string,
    lines: PurchaseRequestLineDraft[]
  ) {
    await this.db
      .delete(procurementPurchaseRequestLine)
      .where(
        and(
          eq(procurementPurchaseRequestLine.businessId, businessId),
          eq(procurementPurchaseRequestLine.requestId, requestId)
        )
      );
    if (lines.length === 0) {
      return [];
    }
    const inserted = await this.db
      .insert(procurementPurchaseRequestLine)
      .values(
        lines.map((line, index) => ({
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
        }))
      )
      .returning();
    return inserted.map(mapLine);
  }

  async listLines(businessId: string, requestId: string) {
    const rows = await this.db
      .select()
      .from(procurementPurchaseRequestLine)
      .where(
        and(
          eq(procurementPurchaseRequestLine.businessId, businessId),
          eq(procurementPurchaseRequestLine.requestId, requestId)
        )
      )
      .orderBy(asc(procurementPurchaseRequestLine.lineNumber));
    return rows.map(mapLine);
  }

  async addDocument(
    businessId: string,
    requestId: string,
    document: Omit<PurchaseRequestDocumentRecord, "id" | "requestId" | "businessId"> & {
      createdBy: string | null;
    }
  ) {
    const [row] = await this.db
      .insert(procurementRequestDocument)
      .values({
        id: randomUUID(),
        businessId,
        requestId,
        documentTypeCode: document.documentTypeCode,
        originalFileName: document.originalFileName,
        storageReference: document.storageReference,
        createdBy: document.createdBy,
      })
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapDocument(row);
  }

  async listDocuments(businessId: string, requestId: string) {
    const rows = await this.db
      .select()
      .from(procurementRequestDocument)
      .where(
        and(
          eq(procurementRequestDocument.businessId, businessId),
          eq(procurementRequestDocument.requestId, requestId)
        )
      )
      .orderBy(desc(procurementRequestDocument.createdAt));
    return rows.map(mapDocument);
  }
}

export function createPurchaseRequestRepository() {
  return new PurchaseRequestRepository();
}

export class PurchaseRequestControlRepository implements PurchaseRequestControlPort {
  constructor(private readonly db = getDb()) {}

  async getControl(businessId: string): Promise<PurchaseRequestControlRecord | null> {
    const [row] = await this.db
      .select()
      .from(procurementRequestControl)
      .where(eq(procurementRequestControl.businessId, businessId))
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      businessId: row.businessId,
      requiresApproval: row.requiresApproval,
      overBudgetMode: row.overBudgetMode,
    };
  }
}

export function createPurchaseRequestControlRepository() {
  return new PurchaseRequestControlRepository();
}
