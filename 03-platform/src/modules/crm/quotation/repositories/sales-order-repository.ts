/**
 * Purpose:
 * Persist and read sales order handoff rows (persistence only).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.4)
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { salesOrder, salesOrderLine } from "@/db/schema/sales-order";

type DbClient = PostgresJsDatabase<typeof schema>;

export type SalesOrderInsertValues = {
  businessId: string;
  orderNumber: string;
  quotationId: string;
  quotationVersionId?: string | null;
  crmRecordId?: string | null;
  partyId: string;
  accountId?: string | null;
  opportunityId?: string | null;
  status: string;
  currencyCode: string;
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  handoffStatus: string;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type SalesOrderLineInsertValues = {
  businessId: string;
  salesOrderId: string;
  lineNumber: number;
  offeringId: string;
  offeringVariantId?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  quotationLineId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class SalesOrderRepository {
  async insert(values: SalesOrderInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(salesOrder)
      .values({
        businessId: values.businessId,
        orderNumber: values.orderNumber,
        quotationId: values.quotationId,
        quotationVersionId: values.quotationVersionId ?? null,
        crmRecordId: values.crmRecordId ?? null,
        partyId: values.partyId,
        accountId: values.accountId ?? null,
        opportunityId: values.opportunityId ?? null,
        status: values.status,
        currencyCode: values.currencyCode,
        subtotal: values.subtotal,
        taxAmount: values.taxAmount,
        grandTotal: values.grandTotal,
        handoffStatus: values.handoffStatus,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(businessId: string, salesOrderId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(salesOrder)
      .where(
        and(eq(salesOrder.businessId, businessId), eq(salesOrder.id, salesOrderId))
      )
      .limit(1);

    return row ?? null;
  }

  async findByQuotationId(
    businessId: string,
    quotationId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(salesOrder)
      .where(
        and(
          eq(salesOrder.businessId, businessId),
          eq(salesOrder.quotationId, quotationId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(salesOrder)
      .where(
        and(eq(salesOrder.businessId, businessId), eq(salesOrder.partyId, partyId))
      )
      .orderBy(desc(salesOrder.createdAt));
  }

  async countAll(businessId: string, dbClient: DbClient = getDb()): Promise<number> {
    const rows = await dbClient
      .select({ id: salesOrder.id })
      .from(salesOrder)
      .where(eq(salesOrder.businessId, businessId));

    return rows.length;
  }
}

export class SalesOrderLineRepository {
  async insertMany(
    values: SalesOrderLineInsertValues[],
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) {
      return [];
    }

    return dbClient.insert(salesOrderLine).values(values).returning();
  }

  async listBySalesOrderId(
    businessId: string,
    salesOrderId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(salesOrderLine)
      .where(
        and(
          eq(salesOrderLine.businessId, businessId),
          eq(salesOrderLine.salesOrderId, salesOrderId)
        )
      )
      .orderBy(salesOrderLine.lineNumber);
  }
}

export function createSalesOrderRepository() {
  return new SalesOrderRepository();
}

export function createSalesOrderLineRepository() {
  return new SalesOrderLineRepository();
}
