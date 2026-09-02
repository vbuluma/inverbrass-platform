/**
 * Purpose:
 * Persist purchase orders with tenant isolation. Soft-delete only.
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import {
  procurementPoControl,
  procurementPoSupplierResponse,
  procurementPoSupplierToken,
  procurementPurchaseOrder,
  procurementPurchaseOrderLine,
  procurementPurchaseOrderPaymentTerm,
  procurementPurchaseOrderVersion,
} from "@/db/schema/procurement-purchase-order";
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

function mapHeader(row: typeof procurementPurchaseOrder.$inferSelect): PurchaseOrderRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    poNumber: row.poNumber,
    profileId: row.profileId,
    sourceType: row.sourceType,
    purchaseRequestId: row.purchaseRequestId,
    sourcingEventId: row.sourcingEventId,
    awardId: row.awardId,
    contractId: row.contractId,
    contractVersionId: row.contractVersionId,
    callOffReference: row.callOffReference,
    winningQuoteId: row.winningQuoteId,
    currencyCode: row.currencyCode,
    status: row.status,
    currentVersionId: row.currentVersionId,
    acceptedVersionId: row.acceptedVersionId,
    subtotalAmount: row.subtotalAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    year1Amount: row.year1Amount,
    tcvAmount: row.tcvAmount,
    tcoAmount: row.tcoAmount,
    deliveryLocation: row.deliveryLocation,
    warrantyNotes: row.warrantyNotes,
    termsAndConditions: row.termsAndConditions,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    issuedAt: row.issuedAt,
    issuedBy: row.issuedBy,
    acceptedAt: row.acceptedAt,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    closureReason: row.closureReason,
    issueIdempotencyKey: row.issueIdempotencyKey,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
  };
}

function mapVersion(
  row: typeof procurementPurchaseOrderVersion.$inferSelect
): PurchaseOrderVersionRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    purchaseOrderId: row.purchaseOrderId,
    versionNumber: row.versionNumber,
    status: row.status,
    subtotalAmount: row.subtotalAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    year1Amount: row.year1Amount,
    tcvAmount: row.tcvAmount,
    tcoAmount: row.tcoAmount,
    promisedDeliveryDate: row.promisedDeliveryDate,
    warrantyNotes: row.warrantyNotes,
    termsAndConditions: row.termsAndConditions,
    issuedAt: row.issuedAt,
    issuedBy: row.issuedBy,
    supersededAt: row.supersededAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

function mapLine(row: typeof procurementPurchaseOrderLine.$inferSelect): PoLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    versionId: row.versionId,
    awardLineId: row.awardLineId,
    quoteLineId: row.quoteLineId,
    purchaseRequestLineId: row.purchaseRequestLineId,
    catalogueItemId: row.catalogueItemId,
    sequence: row.sequence,
    description: row.description,
    quantity: row.quantity,
    uom: row.uom,
    unitPrice: row.unitPrice,
    taxRate: row.taxRate,
    lineSubtotal: row.lineSubtotal,
    lineTax: row.lineTax,
    lineTotal: row.lineTotal,
    promisedDeliveryDate: row.promisedDeliveryDate,
    deliveryLocation: row.deliveryLocation,
    comments: row.comments,
    lineType: row.lineType,
  };
}

function mapPaymentTerm(
  row: typeof procurementPurchaseOrderPaymentTerm.$inferSelect
): PoPaymentTermRecord {
  return {
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
  };
}

function mapToken(row: typeof procurementPoSupplierToken.$inferSelect): PoSupplierTokenRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    purchaseOrderId: row.purchaseOrderId,
    versionId: row.versionId,
    profileId: row.profileId,
    accessToken: row.accessToken,
    tokenExpiresAt: row.tokenExpiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

function mapResponse(
  row: typeof procurementPoSupplierResponse.$inferSelect
): PoSupplierResponseRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    purchaseOrderId: row.purchaseOrderId,
    versionId: row.versionId,
    profileId: row.profileId,
    actionType: row.actionType,
    reason: row.reason,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
  };
}

function assertTenant<T extends { businessId: string }>(
  businessId: string,
  row: T | null | undefined,
  code: (typeof PROCUREMENT_ERROR_CODES)[keyof typeof PROCUREMENT_ERROR_CODES] = PROCUREMENT_ERROR_CODES.PO_NOT_FOUND
): T {
  if (!row || row.businessId !== businessId) {
    throw new ProcurementError(code, undefined, 404);
  }
  return row;
}

export class PurchaseOrderRepository implements PurchaseOrderStorePort {
  constructor(private readonly db = getDb()) {}

  async insert(values: PurchaseOrderInsert) {
    const [row] = await this.db
      .insert(procurementPurchaseOrder)
      .values({
        id: values.id,
        businessId: values.businessId,
        poNumber: values.poNumber,
        profileId: values.profileId,
        sourceType: values.sourceType,
        purchaseRequestId: values.purchaseRequestId,
        sourcingEventId: values.sourcingEventId,
        awardId: values.awardId,
        contractId: values.contractId,
        contractVersionId: values.contractVersionId,
        callOffReference: values.callOffReference,
        winningQuoteId: values.winningQuoteId,
        currencyCode: values.currencyCode,
        status: values.status,
        currentVersionId: values.currentVersionId,
        acceptedVersionId: values.acceptedVersionId,
        subtotalAmount: values.subtotalAmount,
        taxAmount: values.taxAmount,
        totalAmount: values.totalAmount,
        year1Amount: values.year1Amount,
        tcvAmount: values.tcvAmount,
        tcoAmount: values.tcoAmount,
        deliveryLocation: values.deliveryLocation,
        warrantyNotes: values.warrantyNotes,
        termsAndConditions: values.termsAndConditions,
        submittedAt: values.submittedAt,
        submittedBy: values.submittedBy,
        approvedAt: values.approvedAt,
        approvedBy: values.approvedBy,
        issuedAt: values.issuedAt,
        issuedBy: values.issuedBy,
        acceptedAt: values.acceptedAt,
        cancelledAt: values.cancelledAt,
        cancelledBy: values.cancelledBy,
        cancellationReason: values.cancellationReason,
        closedAt: values.closedAt,
        closedBy: values.closedBy,
        closureReason: values.closureReason,
        issueIdempotencyKey: values.issueIdempotencyKey,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        deletedAt: values.deletedAt ?? null,
      })
      .returning();
    return mapHeader(row);
  }

  async update(businessId: string, purchaseOrderId: string, patch: PurchaseOrderPatch) {
    const [row] = await this.db
      .update(procurementPurchaseOrder)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementPurchaseOrder.id, purchaseOrderId),
          eq(procurementPurchaseOrder.businessId, businessId),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      )
      .returning();
    return mapHeader(assertTenant(businessId, row));
  }

  async findById(businessId: string, purchaseOrderId: string) {
    const [row] = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.id, purchaseOrderId),
          eq(procurementPurchaseOrder.businessId, businessId),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async findByAwardId(businessId: string, awardId: string) {
    const [row] = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          eq(procurementPurchaseOrder.awardId, awardId),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByContractId(businessId: string, contractId: string) {
    const rows = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          eq(procurementPurchaseOrder.contractId, contractId),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      );
    return rows.map(mapHeader);
  }

  async findByIssueIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          eq(procurementPurchaseOrder.issueIdempotencyKey, idempotencyKey),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(procurementPurchaseOrder)
      .where(
        and(
          eq(procurementPurchaseOrder.businessId, businessId),
          isNull(procurementPurchaseOrder.deletedAt)
        )
      )
      .orderBy(desc(procurementPurchaseOrder.createdAt));
    return rows.map(mapHeader);
  }

  async insertVersion(
    values: Omit<PurchaseOrderVersionRecord, "createdAt"> & { createdAt?: Date }
  ) {
    const [row] = await this.db
      .insert(procurementPurchaseOrderVersion)
      .values({
        id: values.id,
        businessId: values.businessId,
        purchaseOrderId: values.purchaseOrderId,
        versionNumber: values.versionNumber,
        status: values.status,
        subtotalAmount: values.subtotalAmount,
        taxAmount: values.taxAmount,
        totalAmount: values.totalAmount,
        year1Amount: values.year1Amount,
        tcvAmount: values.tcvAmount,
        tcoAmount: values.tcoAmount,
        promisedDeliveryDate: values.promisedDeliveryDate,
        warrantyNotes: values.warrantyNotes,
        termsAndConditions: values.termsAndConditions,
        issuedAt: values.issuedAt,
        issuedBy: values.issuedBy,
        supersededAt: values.supersededAt,
        createdBy: values.createdBy,
      })
      .returning();
    return mapVersion(row);
  }

  async updateVersion(
    businessId: string,
    versionId: string,
    patch: Partial<Omit<PurchaseOrderVersionRecord, "id" | "businessId" | "purchaseOrderId">>
  ) {
    const [row] = await this.db
      .update(procurementPurchaseOrderVersion)
      .set(patch)
      .where(
        and(
          eq(procurementPurchaseOrderVersion.id, versionId),
          eq(procurementPurchaseOrderVersion.businessId, businessId)
        )
      )
      .returning();
    return mapVersion(assertTenant(businessId, row, PROCUREMENT_ERROR_CODES.PO_VERSION_INVALID));
  }

  async findVersionById(businessId: string, versionId: string) {
    const [row] = await this.db
      .select()
      .from(procurementPurchaseOrderVersion)
      .where(
        and(
          eq(procurementPurchaseOrderVersion.id, versionId),
          eq(procurementPurchaseOrderVersion.businessId, businessId)
        )
      )
      .limit(1);
    return row ? mapVersion(row) : null;
  }

  async listVersions(purchaseOrderId: string) {
    const rows = await this.db
      .select()
      .from(procurementPurchaseOrderVersion)
      .where(eq(procurementPurchaseOrderVersion.purchaseOrderId, purchaseOrderId))
      .orderBy(asc(procurementPurchaseOrderVersion.versionNumber));
    return rows.map(mapVersion);
  }

  async insertLines(
    businessId: string,
    versionId: string,
    lines: Array<Omit<PoLineRecord, "id" | "businessId" | "versionId">>
  ) {
    if (lines.length === 0) {
      return [];
    }
    const rows = await this.db
      .insert(procurementPurchaseOrderLine)
      .values(
        lines.map((line) => ({
          id: randomUUID(),
          businessId,
          versionId,
          awardLineId: line.awardLineId,
          quoteLineId: line.quoteLineId,
          purchaseRequestLineId: line.purchaseRequestLineId,
          catalogueItemId: line.catalogueItemId,
          sequence: line.sequence,
          description: line.description,
          quantity: line.quantity,
          uom: line.uom,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          lineSubtotal: line.lineSubtotal,
          lineTax: line.lineTax,
          lineTotal: line.lineTotal,
          promisedDeliveryDate: line.promisedDeliveryDate,
          deliveryLocation: line.deliveryLocation,
          comments: line.comments,
          lineType: line.lineType ?? "INVENTORY",
        }))
      )
      .returning();
    return rows.map(mapLine);
  }

  async listLines(versionId: string) {
    const rows = await this.db
      .select()
      .from(procurementPurchaseOrderLine)
      .where(eq(procurementPurchaseOrderLine.versionId, versionId))
      .orderBy(asc(procurementPurchaseOrderLine.sequence));
    return rows.map(mapLine);
  }

  async insertPaymentTerms(
    businessId: string,
    versionId: string,
    terms: Array<Omit<PoPaymentTermRecord, "id" | "businessId" | "versionId">>
  ) {
    if (terms.length === 0) {
      return;
    }
    await this.db.insert(procurementPurchaseOrderPaymentTerm).values(
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
      .from(procurementPurchaseOrderPaymentTerm)
      .where(eq(procurementPurchaseOrderPaymentTerm.versionId, versionId))
      .orderBy(asc(procurementPurchaseOrderPaymentTerm.sequence));
    return rows.map(mapPaymentTerm);
  }

  async insertSupplierToken(
    values: Omit<PoSupplierTokenRecord, "createdAt"> & { createdAt?: Date }
  ) {
    const [row] = await this.db
      .insert(procurementPoSupplierToken)
      .values({
        id: values.id,
        businessId: values.businessId,
        purchaseOrderId: values.purchaseOrderId,
        versionId: values.versionId,
        profileId: values.profileId,
        accessToken: values.accessToken,
        tokenExpiresAt: values.tokenExpiresAt,
        revokedAt: values.revokedAt,
      })
      .returning();
    return mapToken(row);
  }

  async findTokenByAccessToken(token: string) {
    const [row] = await this.db
      .select()
      .from(procurementPoSupplierToken)
      .where(eq(procurementPoSupplierToken.accessToken, token))
      .limit(1);
    return row ? mapToken(row) : null;
  }

  async revokeTokensForVersion(businessId: string, versionId: string, revokedAt: Date) {
    await this.db
      .update(procurementPoSupplierToken)
      .set({ revokedAt })
      .where(
        and(
          eq(procurementPoSupplierToken.businessId, businessId),
          eq(procurementPoSupplierToken.versionId, versionId),
          isNull(procurementPoSupplierToken.revokedAt)
        )
      );
  }

  async insertSupplierResponse(
    values: Omit<PoSupplierResponseRecord, "createdAt"> & { createdAt?: Date }
  ) {
    const [row] = await this.db
      .insert(procurementPoSupplierResponse)
      .values({
        id: values.id,
        businessId: values.businessId,
        purchaseOrderId: values.purchaseOrderId,
        versionId: values.versionId,
        profileId: values.profileId,
        actionType: values.actionType,
        reason: values.reason,
        idempotencyKey: values.idempotencyKey,
      })
      .returning();
    return mapResponse(row);
  }

  async findSupplierResponseByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(procurementPoSupplierResponse)
      .where(
        and(
          eq(procurementPoSupplierResponse.businessId, businessId),
          eq(procurementPoSupplierResponse.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapResponse(row) : null;
  }
}

export class PurchaseOrderControlRepository implements PurchaseOrderControlPort {
  constructor(private readonly db = getDb()) {}

  private mapControl(row: typeof procurementPoControl.$inferSelect): PurchaseOrderControlRecord {
    return {
      businessId: row.businessId,
      requiresApproval: row.requiresApproval,
      skipRfxEnabled: row.skipRfxEnabled,
      skipRfxMaxAmount: row.skipRfxMaxAmount,
      materialAmendmentThreshold: row.materialAmendmentThreshold,
    };
  }

  async getControl(businessId: string) {
    const [row] = await this.db
      .select()
      .from(procurementPoControl)
      .where(eq(procurementPoControl.businessId, businessId))
      .limit(1);
    return row ? this.mapControl(row) : null;
  }

  async getOrCreateControl(businessId: string) {
    const existing = await this.getControl(businessId);
    if (existing) {
      return existing;
    }
    const [row] = await this.db
      .insert(procurementPoControl)
      .values({ businessId })
      .returning();
    return this.mapControl(row);
  }
}

export function createPurchaseOrderRepository(): PurchaseOrderStorePort {
  return new PurchaseOrderRepository();
}

export function createPurchaseOrderControlRepository(): PurchaseOrderControlPort {
  return new PurchaseOrderControlRepository();
}
