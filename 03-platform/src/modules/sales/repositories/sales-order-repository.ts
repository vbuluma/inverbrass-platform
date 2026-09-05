/**
 * Purpose:
 * Persist BP-006 sales orders, lines, and consumed commercial contracts.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

import { and, desc, eq, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  salesOrder,
  salesOrderCommercialLink,
  salesOrderLine,
} from "@/db/schema/sales-order";
import type {
  SalesOrderCommercialLinkInsert,
  SalesOrderCommercialLinkRecord,
  SalesOrderInsert,
  SalesOrderLineInsert,
  SalesOrderLineRecord,
  SalesOrderRecord,
  SalesOrderRepositoryPort,
} from "@/modules/sales/ports";
import { SalesOrderError, SALES_ERROR_CODES } from "@/modules/sales/errors";

type DbClient = PostgresJsDatabase<typeof schema>;

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function mapOrder(row: typeof salesOrder.$inferSelect): SalesOrderRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    orderNumber: row.orderNumber,
    sourceType: row.sourceType,
    quotationId: row.quotationId,
    quotationVersionId: row.quotationVersionId,
    crmRecordId: row.crmRecordId,
    partyId: row.partyId,
    accountId: row.accountId,
    opportunityId: row.opportunityId,
    status: row.status,
    currencyCode: row.currencyCode,
    orderDate: row.orderDate,
    expectedAmount: String(row.expectedAmount),
    subtotal: String(row.subtotal),
    taxAmount: String(row.taxAmount),
    grandTotal: String(row.grandTotal),
    commercialContractId: row.commercialContractId,
    snapshotId: row.snapshotId,
    confirmationRequiresSod: row.confirmationRequiresSod,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt,
    confirmationRejectedBy: row.confirmationRejectedBy,
    confirmationRejectedAt: row.confirmationRejectedAt,
    confirmationRejectedReason: row.confirmationRejectedReason,
    completionRequiresSod: row.completionRequiresSod,
    completionSubmittedBy: row.completionSubmittedBy,
    completionSubmittedAt: row.completionSubmittedAt,
    completedBy: row.completedBy,
    completedAt: row.completedAt,
    completionRejectedBy: row.completionRejectedBy,
    completionRejectedAt: row.completionRejectedAt,
    completionRejectedReason: row.completionRejectedReason,
    handoffStatus: row.handoffStatus,
    paymentStatus: row.paymentStatus,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

function mapLine(row: typeof salesOrderLine.$inferSelect): SalesOrderLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    lineNumber: row.lineNumber,
    offeringId: row.offeringId,
    offeringVariantId: row.offeringVariantId,
    lineType: row.lineType,
    description: row.description,
    quantity: String(row.quantity),
    agreedUnitValue: String(row.agreedUnitValue),
    commercialLineAmount: String(row.commercialLineAmount),
    currencyCode: row.currencyCode,
    unitPrice: String(row.unitPrice),
    lineTotal: String(row.lineTotal),
    snapshotId: row.snapshotId,
    commercialContractId: row.commercialContractId,
    commercialBreakdown: row.commercialBreakdown,
    quotationLineId: row.quotationLineId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
  };
}

function mapLink(
  row: typeof salesOrderCommercialLink.$inferSelect
): SalesOrderCommercialLinkRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    salesOrderId: row.salesOrderId,
    salesOrderLineId: row.salesOrderLineId,
    snapshotId: row.snapshotId,
    commercialContractId: row.commercialContractId,
    expectedAmountId: row.expectedAmountId,
    expectedPayable: String(row.expectedPayable),
    currencyCode: row.currencyCode,
    integrityHash: row.integrityHash,
    snapshotPayload: row.snapshotPayload as SalesOrderCommercialLinkRecord["snapshotPayload"],
    contractPayload: row.contractPayload as SalesOrderCommercialLinkRecord["contractPayload"],
    provenance: row.provenance,
    consumerRef: row.consumerRef,
    consumedAt: row.consumedAt,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class SalesOrderRepository implements SalesOrderRepositoryPort {
  constructor(private readonly dbClient: DbClient = getDb()) {}

  async insert(values: SalesOrderInsert): Promise<SalesOrderRecord> {
    const [row] = await this.dbClient
      .insert(salesOrder)
      .values({
        id: values.id,
        businessId: values.businessId,
        orderNumber: values.orderNumber,
        sourceType: values.sourceType,
        quotationId: values.quotationId,
        quotationVersionId: values.quotationVersionId,
        crmRecordId: values.crmRecordId,
        partyId: values.partyId,
        accountId: values.accountId,
        opportunityId: values.opportunityId,
        status: values.status,
        currencyCode: values.currencyCode,
        orderDate: values.orderDate,
        expectedAmount: values.expectedAmount,
        subtotal: values.subtotal,
        taxAmount: values.taxAmount,
        grandTotal: values.grandTotal,
        commercialContractId: values.commercialContractId,
        snapshotId: values.snapshotId,
        confirmationRequiresSod: values.confirmationRequiresSod,
        submittedBy: values.submittedBy,
        submittedAt: values.submittedAt,
        confirmedBy: values.confirmedBy,
        confirmedAt: values.confirmedAt,
        confirmationRejectedBy: values.confirmationRejectedBy,
        confirmationRejectedAt: values.confirmationRejectedAt,
        confirmationRejectedReason: values.confirmationRejectedReason,
        completionRequiresSod: values.completionRequiresSod ?? true,
        completionSubmittedBy: values.completionSubmittedBy,
        completionSubmittedAt: values.completionSubmittedAt,
        completedBy: values.completedBy,
        completedAt: values.completedAt,
        completionRejectedBy: values.completionRejectedBy,
        completionRejectedAt: values.completionRejectedAt,
        completionRejectedReason: values.completionRejectedReason,
        handoffStatus: values.handoffStatus,
        paymentStatus: values.paymentStatus,
        metadata: values.metadata,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    return mapOrder(row);
  }

  async update(
    businessId: string,
    orderId: string,
    values: Partial<SalesOrderRecord>
  ): Promise<SalesOrderRecord> {
    const [row] = await this.dbClient
      .update(salesOrder)
      .set({
        sourceType: values.sourceType,
        quotationId: values.quotationId,
        quotationVersionId: values.quotationVersionId,
        crmRecordId: values.crmRecordId,
        partyId: values.partyId ?? undefined,
        accountId: values.accountId,
        opportunityId: values.opportunityId,
        status: values.status,
        currencyCode: values.currencyCode,
        orderDate: asDate(values.orderDate) ?? undefined,
        expectedAmount: values.expectedAmount,
        subtotal: values.subtotal,
        taxAmount: values.taxAmount,
        grandTotal: values.grandTotal,
        commercialContractId: values.commercialContractId,
        snapshotId: values.snapshotId,
        confirmationRequiresSod: values.confirmationRequiresSod,
        submittedBy: values.submittedBy,
        submittedAt: asDate(values.submittedAt) ?? undefined,
        confirmedBy: values.confirmedBy,
        confirmedAt: asDate(values.confirmedAt) ?? undefined,
        confirmationRejectedBy: values.confirmationRejectedBy,
        confirmationRejectedAt: asDate(values.confirmationRejectedAt) ?? undefined,
        confirmationRejectedReason: values.confirmationRejectedReason,
        completionRequiresSod: values.completionRequiresSod,
        completionSubmittedBy: values.completionSubmittedBy,
        completionSubmittedAt: asDate(values.completionSubmittedAt) ?? undefined,
        completedBy: values.completedBy,
        completedAt: asDate(values.completedAt) ?? undefined,
        completionRejectedBy: values.completionRejectedBy,
        completionRejectedAt: asDate(values.completionRejectedAt) ?? undefined,
        completionRejectedReason: values.completionRejectedReason,
        handoffStatus: values.handoffStatus,
        paymentStatus: values.paymentStatus,
        metadata: values.metadata,
        updatedBy: values.updatedBy,
        updatedAt: new Date(),
        version: values.version,
      })
      .where(and(eq(salesOrder.businessId, businessId), eq(salesOrder.id, orderId)))
      .returning();
    return mapOrder(row);
  }

  async replaceLines(
    businessId: string,
    orderId: string,
    lines: SalesOrderLineInsert[]
  ): Promise<SalesOrderLineRecord[]> {
    await this.dbClient
      .delete(salesOrderLine)
      .where(
        and(
          eq(salesOrderLine.businessId, businessId),
          eq(salesOrderLine.salesOrderId, orderId)
        )
      );
    if (lines.length === 0) {
      return [];
    }
    const rows = await this.dbClient
      .insert(salesOrderLine)
      .values(
        lines.map((line) => ({
          id: line.id,
          businessId,
          salesOrderId: orderId,
          lineNumber: line.lineNumber,
          offeringId: line.offeringId,
          offeringVariantId: line.offeringVariantId,
          lineType: line.lineType,
          description: line.description,
          quantity: line.quantity,
          agreedUnitValue: line.agreedUnitValue,
          commercialLineAmount: line.commercialLineAmount,
          currencyCode: line.currencyCode,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          snapshotId: line.snapshotId,
          commercialContractId: line.commercialContractId,
          commercialBreakdown: line.commercialBreakdown,
          quotationLineId: line.quotationLineId,
          metadata: line.metadata,
        }))
      )
      .returning();
    return rows.map(mapLine);
  }

  async replaceCommercialLinks(
    businessId: string,
    orderId: string,
    links: SalesOrderCommercialLinkInsert[]
  ): Promise<SalesOrderCommercialLinkRecord[]> {
    await this.dbClient
      .delete(salesOrderCommercialLink)
      .where(
        and(
          eq(salesOrderCommercialLink.businessId, businessId),
          eq(salesOrderCommercialLink.salesOrderId, orderId)
        )
      );
    if (links.length === 0) {
      return [];
    }
    const rows = await this.dbClient
      .insert(salesOrderCommercialLink)
      .values(
        links.map((link) => ({
          id: link.id,
          businessId,
          salesOrderId: orderId,
          salesOrderLineId: link.salesOrderLineId,
          snapshotId: link.snapshotId,
          commercialContractId: link.commercialContractId,
          expectedAmountId: link.expectedAmountId,
          expectedPayable: link.expectedPayable,
          currencyCode: link.currencyCode,
          integrityHash: link.integrityHash,
          snapshotPayload: link.snapshotPayload,
          contractPayload: link.contractPayload,
          provenance: link.provenance,
          consumerRef: link.consumerRef,
          consumedAt: link.consumedAt,
          createdBy: link.createdBy,
        }))
      )
      .returning();
    return rows.map(mapLink);
  }

  async findById(businessId: string, orderId: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesOrder)
      .where(and(eq(salesOrder.businessId, businessId), eq(salesOrder.id, orderId)))
      .limit(1);
    return row ? mapOrder(row) : null;
  }

  async findByOrderNumber(businessId: string, orderNumber: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesOrder)
      .where(
        and(
          eq(salesOrder.businessId, businessId),
          eq(salesOrder.orderNumber, orderNumber)
        )
      )
      .limit(1);
    return row ? mapOrder(row) : null;
  }

  async findByQuotationId(businessId: string, quotationId: string) {
    const [row] = await this.dbClient
      .select()
      .from(salesOrder)
      .where(
        and(
          eq(salesOrder.businessId, businessId),
          eq(salesOrder.quotationId, quotationId)
        )
      )
      .limit(1);
    return row ? mapOrder(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesOrder)
      .where(eq(salesOrder.businessId, businessId))
      .orderBy(desc(salesOrder.createdAt));
    return rows.map(mapOrder);
  }

  /**
   * Customer Web candidate orders for a guest/party scope.
   * Callers MUST still run assertCustomerOrderAccess per row.
   */
  async listCandidatesForCustomerWebScope(
    businessId: string,
    scope: { partyId: string | null; guestSessionId: string },
    limit = 50
  ): Promise<SalesOrderRecord[]> {
    const partyClause = scope.partyId
      ? eq(salesOrder.partyId, scope.partyId)
      : undefined;
    const guestClause = sql`${salesOrder.metadata}->'customerWeb'->>'guestSessionId' = ${scope.guestSessionId}`;
    const ownership = partyClause ? or(partyClause, guestClause) : guestClause;

    const rows = await this.dbClient
      .select()
      .from(salesOrder)
      .where(and(eq(salesOrder.businessId, businessId), ownership))
      .orderBy(desc(salesOrder.createdAt))
      .limit(limit);
    return rows.map(mapOrder);
  }

  async countAll(businessId: string) {
    const rows = await this.dbClient
      .select({ id: salesOrder.id })
      .from(salesOrder)
      .where(eq(salesOrder.businessId, businessId));
    return rows.length;
  }

  async listLines(businessId: string, orderId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesOrderLine)
      .where(
        and(
          eq(salesOrderLine.businessId, businessId),
          eq(salesOrderLine.salesOrderId, orderId)
        )
      )
      .orderBy(salesOrderLine.lineNumber);
    return rows.map(mapLine);
  }

  async listCommercialLinks(businessId: string, orderId: string) {
    const rows = await this.dbClient
      .select()
      .from(salesOrderCommercialLink)
      .where(
        and(
          eq(salesOrderCommercialLink.businessId, businessId),
          eq(salesOrderCommercialLink.salesOrderId, orderId)
        )
      );
    return rows.map(mapLink);
  }

  async updateLine(
    businessId: string,
    lineId: string,
    values: Partial<SalesOrderLineRecord>
  ): Promise<SalesOrderLineRecord> {
    const [row] = await this.dbClient
      .update(salesOrderLine)
      .set({
        quantity: values.quantity,
        agreedUnitValue: values.agreedUnitValue,
        commercialLineAmount: values.commercialLineAmount,
        currencyCode: values.currencyCode,
        unitPrice: values.unitPrice,
        lineTotal: values.lineTotal,
        snapshotId: values.snapshotId,
        commercialContractId: values.commercialContractId,
        commercialBreakdown: values.commercialBreakdown,
        offeringId: values.offeringId,
        metadata: values.metadata,
      })
      .where(
        and(eq(salesOrderLine.businessId, businessId), eq(salesOrderLine.id, lineId))
      )
      .returning();
    if (!row) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    return mapLine(row);
  }

  async updateCommercialLink(
    businessId: string,
    linkId: string,
    values: Partial<SalesOrderCommercialLinkRecord>
  ): Promise<SalesOrderCommercialLinkRecord> {
    const [row] = await this.dbClient
      .update(salesOrderCommercialLink)
      .set({
        snapshotId: values.snapshotId,
        commercialContractId: values.commercialContractId,
        expectedAmountId: values.expectedAmountId,
        expectedPayable: values.expectedPayable,
        currencyCode: values.currencyCode,
        integrityHash: values.integrityHash,
        snapshotPayload: values.snapshotPayload,
        contractPayload: values.contractPayload,
        provenance: values.provenance,
        consumedAt: values.consumedAt,
      })
      .where(
        and(
          eq(salesOrderCommercialLink.businessId, businessId),
          eq(salesOrderCommercialLink.id, linkId)
        )
      )
      .returning();
    if (!row) {
      throw new SalesOrderError(SALES_ERROR_CODES.ORDER_NOT_FOUND, undefined, 404);
    }
    return mapLink(row);
  }
}

export function createSalesOrderRepository() {
  return new SalesOrderRepository();
}
