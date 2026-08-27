/**
 * Purpose:
 * Persist and read quotation version rows (persistence only).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1)
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { quotationVersion } from "@/db/schema/quotation";
import type { QuotationVersionInsertValues } from "@/modules/crm/quotation/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export class QuotationVersionRepository {
  async insert(
    values: QuotationVersionInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(quotationVersion)
      .values({
        businessId: values.businessId,
        quotationId: values.quotationId,
        versionNumber: values.versionNumber,
        status: values.status,
        subtotal: values.subtotal ?? "0",
        taxAmount: values.taxAmount ?? "0",
        grandTotal: values.grandTotal ?? "0",
        revisionReason: values.revisionReason ?? null,
        sentAt: values.sentAt ?? null,
        lockedAt: values.lockedAt ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    versionId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(quotationVersion)
      .where(
        and(
          eq(quotationVersion.businessId, businessId),
          eq(quotationVersion.id, versionId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByQuotationAndNumber(
    businessId: string,
    quotationId: string,
    versionNumber: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(quotationVersion)
      .where(
        and(
          eq(quotationVersion.businessId, businessId),
          eq(quotationVersion.quotationId, quotationId),
          eq(quotationVersion.versionNumber, versionNumber)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findCurrentByQuotation(
    businessId: string,
    quotationId: string,
    currentVersionNumber: number,
    dbClient: DbClient = getDb()
  ) {
    return this.findByQuotationAndNumber(
      businessId,
      quotationId,
      currentVersionNumber,
      dbClient
    );
  }

  async listByQuotationId(
    businessId: string,
    quotationId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(quotationVersion)
      .where(
        and(
          eq(quotationVersion.businessId, businessId),
          eq(quotationVersion.quotationId, quotationId)
        )
      )
      .orderBy(desc(quotationVersion.versionNumber));
  }

  async updateTotals(
    businessId: string,
    versionId: string,
    totals: {
      subtotal: string;
      taxAmount: string;
      grandTotal: string;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(quotationVersion)
      .set({
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
      })
      .where(
        and(
          eq(quotationVersion.businessId, businessId),
          eq(quotationVersion.id, versionId)
        )
      )
      .returning();

    return row ?? null;
  }

  async lockVersion(
    businessId: string,
    versionId: string,
    status: string,
    sentAt: Date | null,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(quotationVersion)
      .set({
        status,
        sentAt,
        lockedAt: new Date(),
      })
      .where(
        and(
          eq(quotationVersion.businessId, businessId),
          eq(quotationVersion.id, versionId)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createQuotationVersionRepository() {
  return new QuotationVersionRepository();
}
