/**
 * Purpose:
 * Persist procurement receipts with tenant isolation.
 */

import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import {
  procurementReceipt,
  procurementReceiptHandoff,
  procurementReceiptLine,
  procurementReceivingControl,
} from "@/db/schema/procurement-receiving";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ReceivingControlPort, ReceivingStorePort } from "@/modules/procurement/ports";
import type {
  ReceiptHandoffRecord,
  ReceiptLineRecord,
  ReceiptRecord,
  ReceivingControlRecord,
} from "@/modules/procurement/types";

function mapReceipt(row: typeof procurementReceipt.$inferSelect): ReceiptRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    receiptNumber: row.receiptNumber,
    receiptType: row.receiptType,
    status: row.status,
    purchaseOrderId: row.purchaseOrderId,
    purchaseOrderVersionId: row.purchaseOrderVersionId,
    profileId: row.profileId,
    receiptDate: row.receiptDate,
    receiverUserId: row.receiverUserId,
    deliveryLocation: row.deliveryLocation,
    inspectionStatus: row.inspectionStatus,
    inspectionNotes: row.inspectionNotes,
    inspectedAt: row.inspectedAt,
    inspectedBy: row.inspectedBy,
    servicePeriodStart: row.servicePeriodStart,
    servicePeriodEnd: row.servicePeriodEnd,
    assetCondition: row.assetCondition,
    comments: row.comments,
    evidenceDocumentId: row.evidenceDocumentId,
    overDeliveryFlag: row.overDeliveryFlag,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    confirmedAt: row.confirmedAt,
    confirmedBy: row.confirmedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
  };
}

function mapLine(row: typeof procurementReceiptLine.$inferSelect): ReceiptLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    receiptId: row.receiptId,
    poLineId: row.poLineId,
    lineType: row.lineType,
    sequence: row.sequence,
    description: row.description,
    quantityReceived: row.quantityReceived,
    uom: row.uom,
    catalogueItemId: row.catalogueItemId,
    stockItemId: row.stockItemId,
    discrepancyType: row.discrepancyType,
    discrepancyDescription: row.discrepancyDescription,
    damageFlag: row.damageFlag,
  };
}

function mapHandoff(row: typeof procurementReceiptHandoff.$inferSelect): ReceiptHandoffRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    receiptId: row.receiptId,
    receiptLineId: row.receiptLineId,
    handoffType: row.handoffType,
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    downstreamSystem: row.downstreamSystem,
    downstreamReference: row.downstreamReference,
    errorMessage: row.errorMessage,
    attemptedAt: row.attemptedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ReceivingRepository implements ReceivingStorePort {
  constructor(private readonly db = getDb()) {}

  insertReceipt = async (
    values: Omit<ReceiptRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
      deletedAt?: Date | null;
    }
  ) => {
    const [row] = await this.db
      .insert(procurementReceipt)
      .values({
        id: values.id,
        businessId: values.businessId,
        receiptNumber: values.receiptNumber,
        receiptType: values.receiptType,
        status: values.status,
        purchaseOrderId: values.purchaseOrderId,
        purchaseOrderVersionId: values.purchaseOrderVersionId,
        profileId: values.profileId,
        receiptDate: values.receiptDate,
        receiverUserId: values.receiverUserId,
        deliveryLocation: values.deliveryLocation,
        inspectionStatus: values.inspectionStatus,
        inspectionNotes: values.inspectionNotes,
        inspectedAt: values.inspectedAt,
        inspectedBy: values.inspectedBy,
        servicePeriodStart: values.servicePeriodStart,
        servicePeriodEnd: values.servicePeriodEnd,
        assetCondition: values.assetCondition,
        comments: values.comments,
        evidenceDocumentId: values.evidenceDocumentId,
        overDeliveryFlag: values.overDeliveryFlag,
        submittedAt: values.submittedAt,
        submittedBy: values.submittedBy,
        confirmedAt: values.confirmedAt,
        confirmedBy: values.confirmedBy,
        rejectedAt: values.rejectedAt,
        rejectedBy: values.rejectedBy,
        rejectionReason: values.rejectionReason,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        deletedAt: values.deletedAt ?? null,
      })
      .returning();
    return mapReceipt(row!);
  };

  updateReceipt = async (
    businessId: string,
    receiptId: string,
    patch: Partial<Omit<ReceiptRecord, "id" | "businessId" | "createdAt" | "createdBy">>
  ) => {
    const [row] = await this.db
      .update(procurementReceipt)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(procurementReceipt.id, receiptId),
          eq(procurementReceipt.businessId, businessId),
          isNull(procurementReceipt.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND, undefined, 404);
    }
    return mapReceipt(row);
  };

  findReceiptById = async (businessId: string, receiptId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementReceipt)
      .where(
        and(
          eq(procurementReceipt.id, receiptId),
          eq(procurementReceipt.businessId, businessId),
          isNull(procurementReceipt.deletedAt)
        )
      )
      .limit(1);
    return row ? mapReceipt(row) : null;
  };

  listReceiptsByBusiness = async (businessId: string) => {
    const rows = await this.db
      .select()
      .from(procurementReceipt)
      .where(and(eq(procurementReceipt.businessId, businessId), isNull(procurementReceipt.deletedAt)));
    return rows.map(mapReceipt);
  };

  listReceiptsByPurchaseOrder = async (businessId: string, purchaseOrderId: string) => {
    const rows = await this.db
      .select()
      .from(procurementReceipt)
      .where(
        and(
          eq(procurementReceipt.businessId, businessId),
          eq(procurementReceipt.purchaseOrderId, purchaseOrderId),
          isNull(procurementReceipt.deletedAt)
        )
      );
    return rows.map(mapReceipt);
  };

  insertReceiptLines = async (lines: ReceiptLineRecord[]) => {
    if (lines.length === 0) {
      return;
    }
    await this.db.insert(procurementReceiptLine).values(
      lines.map((line) => ({
        id: line.id,
        businessId: line.businessId,
        receiptId: line.receiptId,
        poLineId: line.poLineId,
        lineType: line.lineType,
        sequence: line.sequence,
        description: line.description,
        quantityReceived: line.quantityReceived,
        uom: line.uom,
        catalogueItemId: line.catalogueItemId,
        stockItemId: line.stockItemId,
        discrepancyType: line.discrepancyType,
        discrepancyDescription: line.discrepancyDescription,
        damageFlag: line.damageFlag,
      }))
    );
  };

  listReceiptLines = async (receiptId: string) => {
    const rows = await this.db
      .select()
      .from(procurementReceiptLine)
      .where(eq(procurementReceiptLine.receiptId, receiptId));
    return rows.map(mapLine);
  };

  listReceiptLinesByPoLine = async (poLineId: string) => {
    const rows = await this.db
      .select()
      .from(procurementReceiptLine)
      .where(eq(procurementReceiptLine.poLineId, poLineId));
    return rows.map(mapLine);
  };

  listConfirmedReceiptLinesByPoLine = async (businessId: string, poLineId: string) => {
    const rows = await this.db
      .select({ line: procurementReceiptLine })
      .from(procurementReceiptLine)
      .innerJoin(procurementReceipt, eq(procurementReceipt.id, procurementReceiptLine.receiptId))
      .where(
        and(
          eq(procurementReceiptLine.poLineId, poLineId),
          eq(procurementReceipt.businessId, businessId),
          eq(procurementReceipt.status, "CONFIRMED"),
          isNull(procurementReceipt.deletedAt)
        )
      );
    return rows.map((row) => mapLine(row.line));
  };

  insertHandoff = async (
    values: Omit<ReceiptHandoffRecord, "createdAt" | "updatedAt"> & {
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) => {
    const [row] = await this.db
      .insert(procurementReceiptHandoff)
      .values({
        id: values.id,
        businessId: values.businessId,
        receiptId: values.receiptId,
        receiptLineId: values.receiptLineId,
        handoffType: values.handoffType,
        status: values.status,
        idempotencyKey: values.idempotencyKey,
        downstreamSystem: values.downstreamSystem,
        downstreamReference: values.downstreamReference,
        errorMessage: values.errorMessage,
        attemptedAt: values.attemptedAt,
        completedAt: values.completedAt,
      })
      .returning();
    return mapHandoff(row!);
  };

  updateHandoff = async (
    businessId: string,
    handoffId: string,
    patch: Partial<Omit<ReceiptHandoffRecord, "id" | "businessId" | "createdAt">>
  ) => {
    const [row] = await this.db
      .update(procurementReceiptHandoff)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(procurementReceiptHandoff.id, handoffId),
          eq(procurementReceiptHandoff.businessId, businessId)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.RECEIPT_NOT_FOUND, undefined, 404);
    }
    return mapHandoff(row);
  };

  findHandoffByIdempotencyKey = async (businessId: string, idempotencyKey: string) => {
    const [row] = await this.db
      .select()
      .from(procurementReceiptHandoff)
      .where(
        and(
          eq(procurementReceiptHandoff.businessId, businessId),
          eq(procurementReceiptHandoff.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapHandoff(row) : null;
  };

  listHandoffsByReceipt = async (receiptId: string) => {
    const rows = await this.db
      .select()
      .from(procurementReceiptHandoff)
      .where(eq(procurementReceiptHandoff.receiptId, receiptId));
    return rows.map(mapHandoff);
  };

  updateReceiptLine = async (businessId: string, line: ReceiptLineRecord) => {
    await this.db
      .update(procurementReceiptLine)
      .set({
        discrepancyType: line.discrepancyType,
        discrepancyDescription: line.discrepancyDescription,
        damageFlag: line.damageFlag,
      })
      .where(
        and(
          eq(procurementReceiptLine.id, line.id),
          eq(procurementReceiptLine.businessId, businessId)
        )
      );
  };
}

export class ReceivingControlRepository implements ReceivingControlPort {
  constructor(private readonly db = getDb()) {}

  async getControl(businessId: string) {
    const [row] = await this.db
      .select()
      .from(procurementReceivingControl)
      .where(eq(procurementReceivingControl.businessId, businessId))
      .limit(1);
    if (!row) {
      return null;
    }
    return {
      businessId: row.businessId,
      overReceiptPolicy: row.overReceiptPolicy,
      requiresSupplierAcceptance: row.requiresSupplierAcceptance,
      requiresReceiptConfirmation: row.requiresReceiptConfirmation,
    } satisfies ReceivingControlRecord;
  }

  async getOrCreateControl(businessId: string) {
    const existing = await this.getControl(businessId);
    if (existing) {
      return existing;
    }
    const [row] = await this.db
      .insert(procurementReceivingControl)
      .values({ id: randomUUID(), businessId })
      .returning();
    return {
      businessId: row!.businessId,
      overReceiptPolicy: row!.overReceiptPolicy,
      requiresSupplierAcceptance: row!.requiresSupplierAcceptance,
      requiresReceiptConfirmation: row!.requiresReceiptConfirmation,
    };
  }
}

export function createReceivingRepository() {
  return new ReceivingRepository();
}

export function createReceivingControlRepository() {
  return new ReceivingControlRepository();
}
