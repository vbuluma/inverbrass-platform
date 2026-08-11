/**
 * Purpose:
 * Persist and read quotation header rows (persistence only).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1)
 */

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { party } from "@/db/schema/party";
import { quotation } from "@/db/schema/quotation";
import type {
  QuotationInsertValues,
  QuotationSearchFilters,
  QuotationUpdateValues,
} from "@/modules/crm/quotation/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type QuotationRowWithParty = {
  quotation: typeof quotation.$inferSelect;
  partyDisplayName: string | null;
};

export class QuotationRepository {
  async insert(values: QuotationInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(quotation)
      .values({
        businessId: values.businessId,
        quotationNumber: values.quotationNumber,
        partyId: values.partyId,
        crmRecordId: values.crmRecordId ?? null,
        accountId: values.accountId ?? null,
        opportunityId: values.opportunityId ?? null,
        status: values.status,
        currencyCode: values.currencyCode,
        pricingCatalogueId: values.pricingCatalogueId ?? null,
        customerSegment: values.customerSegment ?? null,
        salesChannel: values.salesChannel ?? null,
        region: values.region ?? null,
        validUntil: values.validUntil ?? null,
        currentVersionNumber: values.currentVersionNumber ?? 1,
        ownerUserId: values.ownerUserId ?? null,
        notes: values.notes ?? null,
        termsTemplateCode: values.termsTemplateCode ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(businessId: string, quotationId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(quotation)
      .where(
        and(
          eq(quotation.businessId, businessId),
          eq(quotation.id, quotationId),
          isNull(quotation.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByIdWithParty(
    businessId: string,
    quotationId: string,
    dbClient: DbClient = getDb()
  ): Promise<QuotationRowWithParty | null> {
    const [row] = await dbClient
      .select({
        quotation,
        partyDisplayName: party.displayName,
      })
      .from(quotation)
      .leftJoin(party, eq(quotation.partyId, party.id))
      .where(
        and(
          eq(quotation.businessId, businessId),
          eq(quotation.id, quotationId),
          isNull(quotation.deletedAt)
        )
      )
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      quotation: row.quotation,
      partyDisplayName: row.partyDisplayName,
    };
  }

  async findByNumber(
    businessId: string,
    quotationNumber: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(quotation)
      .where(
        and(
          eq(quotation.businessId, businessId),
          eq(quotation.quotationNumber, quotationNumber),
          isNull(quotation.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    quotationId: string,
    values: QuotationUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(quotation)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(quotation.businessId, businessId),
          eq(quotation.id, quotationId),
          isNull(quotation.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async softDeleteById(
    businessId: string,
    quotationId: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(quotation)
      .set({
        deletedAt: new Date(),
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(quotation.businessId, businessId),
          eq(quotation.id, quotationId),
          isNull(quotation.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async search(
    businessId: string,
    filters: QuotationSearchFilters,
    dbClient: DbClient = getDb()
  ): Promise<{ rows: QuotationRowWithParty[]; totalCount: number }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(quotation.businessId, businessId),
      isNull(quotation.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(quotation.status, filters.status));
    }

    if (filters.partyId) {
      conditions.push(eq(quotation.partyId, filters.partyId));
    }

    if (filters.accountId) {
      conditions.push(eq(quotation.accountId, filters.accountId));
    }

    if (filters.opportunityId) {
      conditions.push(eq(quotation.opportunityId, filters.opportunityId));
    }

    if (filters.crmRecordId) {
      conditions.push(eq(quotation.crmRecordId, filters.crmRecordId));
    }

    if (filters.ownerUserId) {
      conditions.push(eq(quotation.ownerUserId, filters.ownerUserId));
    }

    if (filters.validUntilBefore) {
      conditions.push(
        sql`${quotation.validUntil} <= ${new Date(filters.validUntilBefore)}`
      );
    }

    if (filters.validUntilAfter) {
      conditions.push(
        sql`${quotation.validUntil} >= ${new Date(filters.validUntilAfter)}`
      );
    }

    if (filters.query?.trim()) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(quotation.quotationNumber, pattern),
          ilike(party.displayName, pattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await dbClient
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(quotation)
      .leftJoin(party, eq(quotation.partyId, party.id))
      .where(whereClause);

    const rows = await dbClient
      .select({
        quotation,
        partyDisplayName: party.displayName,
      })
      .from(quotation)
      .leftJoin(party, eq(quotation.partyId, party.id))
      .where(whereClause)
      .orderBy(desc(quotation.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      rows: rows.map((row) => ({
        quotation: row.quotation,
        partyDisplayName: row.partyDisplayName,
      })),
      totalCount: countRow?.totalCount ?? 0,
    };
  }

  async countByStatus(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        status: quotation.status,
        count: sql<number>`count(*)::int`,
      })
      .from(quotation)
      .where(
        and(eq(quotation.businessId, businessId), isNull(quotation.deletedAt))
      )
      .groupBy(quotation.status);
  }

  async countAll(businessId: string, dbClient: DbClient = getDb()): Promise<number> {
    const [row] = await dbClient
      .select({ totalCount: sql<number>`count(*)::int` })
      .from(quotation)
      .where(
        and(eq(quotation.businessId, businessId), isNull(quotation.deletedAt))
      );

    return row?.totalCount ?? 0;
  }
}

export function createQuotationRepository() {
  return new QuotationRepository();
}
