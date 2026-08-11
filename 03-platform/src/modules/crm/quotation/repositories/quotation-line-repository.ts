/**
 * Purpose:
 * Persist and read quotation line item rows (persistence only).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1)
 */

import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { product } from "@/db/schema/product";
import { quotationLine } from "@/db/schema/quotation";
import { unitOfMeasure } from "@/db/schema/unit-of-measure";
import type { QuotationLineInsertValues } from "@/modules/crm/quotation/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type QuotationLineRowWithRelations = {
  line: typeof quotationLine.$inferSelect;
  offeringCode: string;
  offeringName: string;
  unitOfMeasureSymbol: string | null;
};

export type QuotationLineUpdateValues = {
  description?: string | null;
  quantity?: string;
  unitOfMeasureId?: string | null;
  unitPrice?: string;
  pricingItemId?: string | null;
  lineTotal?: string;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class QuotationLineRepository {
  async insert(
    values: QuotationLineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(quotationLine)
      .values({
        businessId: values.businessId,
        quotationVersionId: values.quotationVersionId,
        lineNumber: values.lineNumber,
        offeringId: values.offeringId,
        offeringVariantId: values.offeringVariantId ?? null,
        description: values.description ?? null,
        quantity: values.quantity,
        unitOfMeasureId: values.unitOfMeasureId ?? null,
        unitPrice: values.unitPrice,
        pricingItemId: values.pricingItemId ?? null,
        lineTotal: values.lineTotal,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async insertMany(
    values: QuotationLineInsertValues[],
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) {
      return [];
    }

    return dbClient.insert(quotationLine).values(
      values.map((item) => ({
        businessId: item.businessId,
        quotationVersionId: item.quotationVersionId,
        lineNumber: item.lineNumber,
        offeringId: item.offeringId,
        offeringVariantId: item.offeringVariantId ?? null,
        description: item.description ?? null,
        quantity: item.quantity,
        unitOfMeasureId: item.unitOfMeasureId ?? null,
        unitPrice: item.unitPrice,
        pricingItemId: item.pricingItemId ?? null,
        lineTotal: item.lineTotal,
        metadata: item.metadata ?? null,
        createdBy: item.createdBy ?? null,
        updatedBy: item.updatedBy ?? null,
      }))
    ).returning();
  }

  async findById(
    businessId: string,
    lineId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(quotationLine)
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.id, lineId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByIdWithRelations(
    businessId: string,
    lineId: string,
    dbClient: DbClient = getDb()
  ): Promise<QuotationLineRowWithRelations | null> {
    const [row] = await dbClient
      .select({
        line: quotationLine,
        offeringCode: product.productCode,
        offeringName: product.productName,
        unitOfMeasureSymbol: unitOfMeasure.symbol,
      })
      .from(quotationLine)
      .innerJoin(product, eq(quotationLine.offeringId, product.id))
      .leftJoin(
        unitOfMeasure,
        eq(quotationLine.unitOfMeasureId, unitOfMeasure.id)
      )
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.id, lineId)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      line: row.line,
      offeringCode: row.offeringCode,
      offeringName: row.offeringName,
      unitOfMeasureSymbol: row.unitOfMeasureSymbol,
    };
  }

  async listByVersionIdWithRelations(
    businessId: string,
    quotationVersionId: string,
    dbClient: DbClient = getDb()
  ): Promise<QuotationLineRowWithRelations[]> {
    const rows = await dbClient
      .select({
        line: quotationLine,
        offeringCode: product.productCode,
        offeringName: product.productName,
        unitOfMeasureSymbol: unitOfMeasure.symbol,
      })
      .from(quotationLine)
      .innerJoin(product, eq(quotationLine.offeringId, product.id))
      .leftJoin(
        unitOfMeasure,
        eq(quotationLine.unitOfMeasureId, unitOfMeasure.id)
      )
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.quotationVersionId, quotationVersionId)
        )
      )
      .orderBy(asc(quotationLine.lineNumber));

    return rows.map((row) => ({
      line: row.line,
      offeringCode: row.offeringCode,
      offeringName: row.offeringName,
      unitOfMeasureSymbol: row.unitOfMeasureSymbol,
    }));
  }

  async updateById(
    businessId: string,
    lineId: string,
    values: QuotationLineUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(quotationLine)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.id, lineId)
        )
      )
      .returning();

    return row ?? null;
  }

  async deleteById(
    businessId: string,
    lineId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .delete(quotationLine)
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.id, lineId)
        )
      )
      .returning();

    return row ?? null;
  }

  async deleteByVersionId(
    businessId: string,
    quotationVersionId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .delete(quotationLine)
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.quotationVersionId, quotationVersionId)
        )
      )
      .returning();
  }

  async getNextLineNumber(
    businessId: string,
    quotationVersionId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .select({ lineNumber: quotationLine.lineNumber })
      .from(quotationLine)
      .where(
        and(
          eq(quotationLine.businessId, businessId),
          eq(quotationLine.quotationVersionId, quotationVersionId)
        )
      )
      .orderBy(asc(quotationLine.lineNumber));

    if (rows.length === 0) {
      return 1;
    }

    return Math.max(...rows.map((row) => row.lineNumber)) + 1;
  }
}

export function createQuotationLineRepository() {
  return new QuotationLineRepository();
}
