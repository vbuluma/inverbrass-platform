/**
 * Purpose:
 * Persist supplier invoices, matches, and AP handoff references.
 */

import { and, eq, ilike, isNull, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import {
  procurementApHandoff,
  procurementInvoiceControl,
  procurementInvoiceMatch,
  procurementInvoiceMatchLine,
  procurementSupplierInvoice,
  procurementSupplierInvoiceLine,
} from "@/db/schema/procurement-invoice";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { InvoiceControlPort, InvoiceStorePort } from "@/modules/procurement/ports";
import type {
  ApHandoffRecord,
  InvoiceControlRecord,
  InvoiceMatchLineRecord,
  InvoiceMatchRecord,
  SupplierInvoiceLineRecord,
  SupplierInvoiceRecord,
} from "@/modules/procurement/types";

function mapInvoice(row: typeof procurementSupplierInvoice.$inferSelect): SupplierInvoiceRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    internalInvoiceNumber: row.internalInvoiceNumber,
    supplierInvoiceNumber: row.supplierInvoiceNumber,
    profileId: row.profileId,
    partyId: row.partyId,
    purchaseOrderId: row.purchaseOrderId,
    purchaseOrderVersionId: row.purchaseOrderVersionId,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    currencyCode: row.currencyCode,
    subtotalAmount: row.subtotalAmount,
    taxAmount: row.taxAmount,
    totalAmount: row.totalAmount,
    taxReference: row.taxReference,
    attachmentDocumentId: row.attachmentDocumentId,
    status: row.status,
    matchOutcome: row.matchOutcome,
    matchingMode: row.matchingMode,
    duplicateFlag: row.duplicateFlag,
    duplicateOfInvoiceId: row.duplicateOfInvoiceId,
    matchVersion: row.matchVersion,
    matchIdempotencyKey: row.matchIdempotencyKey,
    capturedAt: row.capturedAt,
    capturedBy: row.capturedBy,
    matchedAt: row.matchedAt,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    paymentReadyAt: row.paymentReadyAt,
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

function mapLine(row: typeof procurementSupplierInvoiceLine.$inferSelect): SupplierInvoiceLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    invoiceId: row.invoiceId,
    poLineId: row.poLineId,
    sequence: row.sequence,
    description: row.description,
    quantity: row.quantity,
    uom: row.uom,
    unitPrice: row.unitPrice,
    taxRate: row.taxRate,
    lineSubtotal: row.lineSubtotal,
    lineTax: row.lineTax,
    lineTotal: row.lineTotal,
    taxReference: row.taxReference,
  };
}

function mapMatch(row: typeof procurementInvoiceMatch.$inferSelect): InvoiceMatchRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    invoiceId: row.invoiceId,
    matchingMode: row.matchingMode,
    outcome: row.outcome,
    idempotencyKey: row.idempotencyKey,
    priceVarianceAmount: row.priceVarianceAmount,
    quantityVarianceAmount: row.quantityVarianceAmount,
    taxVarianceAmount: row.taxVarianceAmount,
    summary: row.summary,
    createdAt: row.createdAt,
  };
}

function mapMatchLine(row: typeof procurementInvoiceMatchLine.$inferSelect): InvoiceMatchLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    matchId: row.matchId,
    invoiceLineId: row.invoiceLineId,
    poLineId: row.poLineId,
    receiptLineId: row.receiptLineId,
    poQuantity: row.poQuantity,
    receiptQuantity: row.receiptQuantity,
    invoiceQuantity: row.invoiceQuantity,
    poAmount: row.poAmount,
    invoiceAmount: row.invoiceAmount,
    varianceType: row.varianceType,
    varianceAmount: row.varianceAmount,
    withinTolerance: row.withinTolerance,
  };
}

function mapHandoff(row: typeof procurementApHandoff.$inferSelect): ApHandoffRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    invoiceId: row.invoiceId,
    status: row.status,
    payeePartyId: row.payeePartyId,
    amount: row.amount,
    currencyCode: row.currencyCode,
    dueDate: row.dueDate,
    purchaseOrderId: row.purchaseOrderId,
    supplierInvoiceNumber: row.supplierInvoiceNumber,
    internalInvoiceNumber: row.internalInvoiceNumber,
    downstreamSystem: row.downstreamSystem,
    downstreamReference: row.downstreamReference,
    idempotencyKey: row.idempotencyKey,
    errorMessage: row.errorMessage,
    attemptedAt: row.attemptedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class InvoiceRepository implements InvoiceStorePort {
  constructor(private readonly db = getDb()) {}

  insertInvoice = async (
    values: Omit<SupplierInvoiceRecord, "createdAt" | "updatedAt" | "deletedAt"> & {
      deletedAt?: Date | null;
    }
  ) => {
    const [row] = await this.db
      .insert(procurementSupplierInvoice)
      .values({
        id: values.id,
        businessId: values.businessId,
        internalInvoiceNumber: values.internalInvoiceNumber,
        supplierInvoiceNumber: values.supplierInvoiceNumber,
        profileId: values.profileId,
        partyId: values.partyId,
        purchaseOrderId: values.purchaseOrderId,
        purchaseOrderVersionId: values.purchaseOrderVersionId,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate,
        currencyCode: values.currencyCode,
        subtotalAmount: values.subtotalAmount,
        taxAmount: values.taxAmount,
        totalAmount: values.totalAmount,
        taxReference: values.taxReference,
        attachmentDocumentId: values.attachmentDocumentId,
        status: values.status,
        matchOutcome: values.matchOutcome,
        matchingMode: values.matchingMode,
        duplicateFlag: values.duplicateFlag,
        duplicateOfInvoiceId: values.duplicateOfInvoiceId,
        matchVersion: values.matchVersion,
        matchIdempotencyKey: values.matchIdempotencyKey,
        capturedAt: values.capturedAt,
        capturedBy: values.capturedBy,
        matchedAt: values.matchedAt,
        approvedAt: values.approvedAt,
        approvedBy: values.approvedBy,
        paymentReadyAt: values.paymentReadyAt,
        rejectedAt: values.rejectedAt,
        rejectedBy: values.rejectedBy,
        rejectionReason: values.rejectionReason,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
        deletedAt: values.deletedAt ?? null,
      })
      .returning();
    return mapInvoice(row!);
  };

  updateInvoice = async (
    businessId: string,
    invoiceId: string,
    patch: Partial<Omit<SupplierInvoiceRecord, "id" | "businessId" | "createdAt" | "createdBy">>
  ) => {
    const [row] = await this.db
      .update(procurementSupplierInvoice)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(procurementSupplierInvoice.id, invoiceId),
          eq(procurementSupplierInvoice.businessId, businessId),
          isNull(procurementSupplierInvoice.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_NOT_FOUND, undefined, 404);
    }
    return mapInvoice(row);
  };

  findInvoiceById = async (businessId: string, invoiceId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.id, invoiceId),
          eq(procurementSupplierInvoice.businessId, businessId),
          isNull(procurementSupplierInvoice.deletedAt)
        )
      )
      .limit(1);
    return row ? mapInvoice(row) : null;
  };

  listInvoicesByBusiness = async (businessId: string) => {
    const rows = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.businessId, businessId),
          isNull(procurementSupplierInvoice.deletedAt)
        )
      );
    return rows.map(mapInvoice);
  };

  listInvoicesByPurchaseOrder = async (businessId: string, purchaseOrderId: string) => {
    const rows = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.businessId, businessId),
          eq(procurementSupplierInvoice.purchaseOrderId, purchaseOrderId),
          isNull(procurementSupplierInvoice.deletedAt)
        )
      );
    return rows.map(mapInvoice);
  };

  findDuplicateInvoice = async (
    businessId: string,
    profileId: string,
    supplierInvoiceNumber: string,
    excludeInvoiceId?: string | null
  ) => {
    const conditions = [
      eq(procurementSupplierInvoice.businessId, businessId),
      eq(procurementSupplierInvoice.profileId, profileId),
      ilike(procurementSupplierInvoice.supplierInvoiceNumber, supplierInvoiceNumber.trim()),
      isNull(procurementSupplierInvoice.deletedAt),
    ];
    if (excludeInvoiceId) {
      conditions.push(ne(procurementSupplierInvoice.id, excludeInvoiceId));
    }
    const [row] = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(and(...conditions))
      .limit(1);
    return row ? mapInvoice(row) : null;
  };

  insertInvoiceLines = async (lines: SupplierInvoiceLineRecord[]) => {
    if (lines.length === 0) {
      return;
    }
    await this.db.insert(procurementSupplierInvoiceLine).values(
      lines.map((line) => ({
        id: line.id,
        businessId: line.businessId,
        invoiceId: line.invoiceId,
        poLineId: line.poLineId,
        sequence: line.sequence,
        description: line.description,
        quantity: line.quantity,
        uom: line.uom,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        lineSubtotal: line.lineSubtotal,
        lineTax: line.lineTax,
        lineTotal: line.lineTotal,
        taxReference: line.taxReference,
      }))
    );
  };

  listInvoiceLines = async (invoiceId: string) => {
    const rows = await this.db
      .select()
      .from(procurementSupplierInvoiceLine)
      .where(eq(procurementSupplierInvoiceLine.invoiceId, invoiceId));
    return rows.map(mapLine);
  };

  replaceInvoiceLines = async (
    businessId: string,
    invoiceId: string,
    lines: SupplierInvoiceLineRecord[]
  ) => {
    await this.db
      .delete(procurementSupplierInvoiceLine)
      .where(
        and(
          eq(procurementSupplierInvoiceLine.invoiceId, invoiceId),
          eq(procurementSupplierInvoiceLine.businessId, businessId)
        )
      );
    await this.insertInvoiceLines(lines);
  };

  insertMatch = async (
    values: Omit<InvoiceMatchRecord, "createdAt"> & { createdAt?: Date }
  ) => {
    const [row] = await this.db
      .insert(procurementInvoiceMatch)
      .values({
        id: values.id,
        businessId: values.businessId,
        invoiceId: values.invoiceId,
        matchingMode: values.matchingMode,
        outcome: values.outcome,
        idempotencyKey: values.idempotencyKey,
        priceVarianceAmount: values.priceVarianceAmount,
        quantityVarianceAmount: values.quantityVarianceAmount,
        taxVarianceAmount: values.taxVarianceAmount,
        summary: values.summary,
        createdAt: values.createdAt ?? new Date(),
      })
      .returning();
    return mapMatch(row!);
  };

  findMatchByIdempotencyKey = async (businessId: string, idempotencyKey: string) => {
    const [row] = await this.db
      .select()
      .from(procurementInvoiceMatch)
      .where(
        and(
          eq(procurementInvoiceMatch.businessId, businessId),
          eq(procurementInvoiceMatch.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapMatch(row) : null;
  };

  listMatchesByInvoice = async (invoiceId: string) => {
    const rows = await this.db
      .select()
      .from(procurementInvoiceMatch)
      .where(eq(procurementInvoiceMatch.invoiceId, invoiceId));
    return rows.map(mapMatch);
  };

  insertMatchLines = async (lines: InvoiceMatchLineRecord[]) => {
    if (lines.length === 0) {
      return;
    }
    await this.db.insert(procurementInvoiceMatchLine).values(
      lines.map((line) => ({
        id: line.id,
        businessId: line.businessId,
        matchId: line.matchId,
        invoiceLineId: line.invoiceLineId,
        poLineId: line.poLineId,
        receiptLineId: line.receiptLineId,
        poQuantity: line.poQuantity,
        receiptQuantity: line.receiptQuantity,
        invoiceQuantity: line.invoiceQuantity,
        poAmount: line.poAmount,
        invoiceAmount: line.invoiceAmount,
        varianceType: line.varianceType,
        varianceAmount: line.varianceAmount,
        withinTolerance: line.withinTolerance,
      }))
    );
  };

  listMatchLines = async (matchId: string) => {
    const rows = await this.db
      .select()
      .from(procurementInvoiceMatchLine)
      .where(eq(procurementInvoiceMatchLine.matchId, matchId));
    return rows.map(mapMatchLine);
  };

  insertApHandoff = async (
    values: Omit<ApHandoffRecord, "createdAt" | "updatedAt"> & {
      createdAt?: Date;
      updatedAt?: Date;
    }
  ) => {
    const now = new Date();
    const [row] = await this.db
      .insert(procurementApHandoff)
      .values({
        id: values.id,
        businessId: values.businessId,
        invoiceId: values.invoiceId,
        status: values.status,
        payeePartyId: values.payeePartyId,
        amount: values.amount,
        currencyCode: values.currencyCode,
        dueDate: values.dueDate,
        purchaseOrderId: values.purchaseOrderId,
        supplierInvoiceNumber: values.supplierInvoiceNumber,
        internalInvoiceNumber: values.internalInvoiceNumber,
        downstreamSystem: values.downstreamSystem,
        idempotencyKey: values.idempotencyKey,
        downstreamReference: values.downstreamReference,
        errorMessage: values.errorMessage,
        attemptedAt: values.attemptedAt,
        completedAt: values.completedAt,
        createdAt: values.createdAt ?? now,
        updatedAt: values.updatedAt ?? now,
      })
      .returning();
    return mapHandoff(row!);
  };

  updateApHandoff = async (
    businessId: string,
    handoffId: string,
    patch: Partial<Omit<ApHandoffRecord, "id" | "businessId" | "createdAt">>
  ) => {
    const [row] = await this.db
      .update(procurementApHandoff)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(procurementApHandoff.id, handoffId), eq(procurementApHandoff.businessId, businessId))
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.HANDOFF_FAILED, undefined, 404);
    }
    return mapHandoff(row);
  };

  findApHandoffByIdempotencyKey = async (businessId: string, idempotencyKey: string) => {
    const [row] = await this.db
      .select()
      .from(procurementApHandoff)
      .where(
        and(
          eq(procurementApHandoff.businessId, businessId),
          eq(procurementApHandoff.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapHandoff(row) : null;
  };

  findApHandoffByInvoice = async (businessId: string, invoiceId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementApHandoff)
      .where(
        and(
          eq(procurementApHandoff.businessId, businessId),
          eq(procurementApHandoff.invoiceId, invoiceId)
        )
      )
      .limit(1);
    return row ? mapHandoff(row) : null;
  };

  listPaymentReadyInvoices = async (businessId: string) => {
    const rows = await this.db
      .select()
      .from(procurementSupplierInvoice)
      .where(
        and(
          eq(procurementSupplierInvoice.businessId, businessId),
          isNull(procurementSupplierInvoice.deletedAt)
        )
      );
    return rows
      .map(mapInvoice)
      .filter((row) => row.status === "PAYMENT_READY" || row.status === "APPROVED");
  };
}

export class InvoiceControlRepository implements InvoiceControlPort {
  constructor(private readonly db = getDb()) {}

  async getControl(businessId: string) {
    const [row] = await this.db
      .select()
      .from(procurementInvoiceControl)
      .where(eq(procurementInvoiceControl.businessId, businessId))
      .limit(1);
    if (!row) {
      return null;
    }
    return mapControl(row);
  }

  async getOrCreateControl(businessId: string) {
    const existing = await this.getControl(businessId);
    if (existing) {
      return existing;
    }
    const [row] = await this.db
      .insert(procurementInvoiceControl)
      .values({ id: randomUUID(), businessId })
      .returning();
    return mapControl(row!);
  }
}

function mapControl(row: typeof procurementInvoiceControl.$inferSelect): InvoiceControlRecord {
  return {
    businessId: row.businessId,
    defaultMatchingMode: row.defaultMatchingMode,
    priceTolerancePercent: row.priceTolerancePercent,
    quantityTolerancePercent: row.quantityTolerancePercent,
    taxToleranceAmount: row.taxToleranceAmount,
    duplicatePolicy: row.duplicatePolicy,
    duplicateCheckAmountDate: row.duplicateCheckAmountDate,
    allowNonPoInvoices: row.allowNonPoInvoices,
    requireReceiptForInventory: row.requireReceiptForInventory,
    requireReceiptForAssets: row.requireReceiptForAssets,
    requireReceiptForServices: row.requireReceiptForServices,
    allowBlacklistedPaymentReady: row.allowBlacklistedPaymentReady,
  };
}

export function createInvoiceRepository() {
  return new InvoiceRepository();
}

export function createInvoiceControlRepository() {
  return new InvoiceControlRepository();
}
