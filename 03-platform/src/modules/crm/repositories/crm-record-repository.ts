/**
 * Purpose:
 * Persist and read CRM master records.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmRecord } from "@/db/schema/crm-record";
import { party } from "@/db/schema/party";
import type { CrmStatusCode } from "@/modules/crm/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmRecordInsertValues = {
  businessId: string;
  partyId: string;
  customerNumber: string;
  crmTypeCode: string;
  statusCode: CrmStatusCode | string;
  ownerPartyId?: string | null;
  relationshipManagerPartyId?: string | null;
  branchId?: string | null;
  sourceCode?: string | null;
  recordSource?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CrmRecordUpdateValues = {
  crmTypeCode?: string;
  statusCode?: string;
  ownerPartyId?: string | null;
  relationshipManagerPartyId?: string | null;
  branchId?: string | null;
  sourceCode?: string | null;
  updatedBy?: string | null;
  version?: number;
};

export type CrmRecordListQueryFilters = {
  search?: string;
  statusCode?: string;
  crmTypeCode?: string;
  ownerPartyId?: string;
  branchId?: string;
  limit?: number;
  offset?: number;
};

export type CrmRecordRow = typeof crmRecord.$inferSelect;

export type CrmRecordJoinedRow = CrmRecordRow & {
  partyDisplayName: string;
  partyTypeCode: string;
  partyNumber: string;
};

export class CrmRecordRepository {
  async insert(values: CrmRecordInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmRecord)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        customerNumber: values.customerNumber,
        crmTypeCode: values.crmTypeCode,
        statusCode: values.statusCode,
        ownerPartyId: values.ownerPartyId ?? null,
        relationshipManagerPartyId: values.relationshipManagerPartyId ?? null,
        branchId: values.branchId ?? null,
        sourceCode: values.sourceCode ?? null,
        recordSource: values.recordSource ?? "PLATFORM_CREATED",
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row!;
  }

  async findByIdJoined(
    businessId: string,
    crmId: string,
    dbClient: DbClient = getDb()
  ): Promise<CrmRecordJoinedRow | null> {
    const [row] = await dbClient
      .select({
        id: crmRecord.id,
        businessId: crmRecord.businessId,
        partyId: crmRecord.partyId,
        customerNumber: crmRecord.customerNumber,
        crmTypeCode: crmRecord.crmTypeCode,
        statusCode: crmRecord.statusCode,
        ownerPartyId: crmRecord.ownerPartyId,
        relationshipManagerPartyId: crmRecord.relationshipManagerPartyId,
        branchId: crmRecord.branchId,
        sourceCode: crmRecord.sourceCode,
        customerSince: crmRecord.customerSince,
        recordSource: crmRecord.recordSource,
        legacyCode: crmRecord.legacyCode,
        legacySystem: crmRecord.legacySystem,
        migrationDate: crmRecord.migrationDate,
        migrationBatch: crmRecord.migrationBatch,
        metadata: crmRecord.metadata,
        createdAt: crmRecord.createdAt,
        createdBy: crmRecord.createdBy,
        updatedAt: crmRecord.updatedAt,
        updatedBy: crmRecord.updatedBy,
        deletedAt: crmRecord.deletedAt,
        version: crmRecord.version,
        partyDisplayName: party.displayName,
        partyTypeCode: party.partyTypeCode,
        partyNumber: party.partyNumber,
      })
      .from(crmRecord)
      .innerJoin(party, eq(crmRecord.partyId, party.id))
      .where(
        and(
          eq(crmRecord.businessId, businessId),
          eq(crmRecord.id, crmId),
          isNull(crmRecord.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmRecord)
      .where(
        and(
          eq(crmRecord.businessId, businessId),
          eq(crmRecord.partyId, partyId),
          isNull(crmRecord.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    crmId: string,
    values: CrmRecordUpdateValues,
    expectedVersion: number,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmRecord)
      .set({
        ...values,
        updatedAt: new Date(),
        version: expectedVersion + 1,
      })
      .where(
        and(
          eq(crmRecord.businessId, businessId),
          eq(crmRecord.id, crmId),
          eq(crmRecord.version, expectedVersion),
          isNull(crmRecord.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async nextCustomerSequence(
    businessId: string,
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmRecord)
      .where(eq(crmRecord.businessId, businessId));

    return Number(row?.total ?? 0) + 1;
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmRecord)
      .where(
        and(eq(crmRecord.businessId, businessId), isNull(crmRecord.deletedAt))
      );

    return Number(row?.total ?? 0);
  }

  async countByStatus(
    businessId: string,
    statusCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ total: count() })
      .from(crmRecord)
      .where(
        and(
          eq(crmRecord.businessId, businessId),
          eq(crmRecord.statusCode, statusCode),
          isNull(crmRecord.deletedAt)
        )
      );

    return Number(row?.total ?? 0);
  }

  async countGroupedByStatus(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        statusCode: crmRecord.statusCode,
        total: count(),
      })
      .from(crmRecord)
      .where(
        and(eq(crmRecord.businessId, businessId), isNull(crmRecord.deletedAt))
      )
      .groupBy(crmRecord.statusCode);
  }

  async countGroupedByType(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        crmTypeCode: crmRecord.crmTypeCode,
        total: count(),
      })
      .from(crmRecord)
      .where(
        and(eq(crmRecord.businessId, businessId), isNull(crmRecord.deletedAt))
      )
      .groupBy(crmRecord.crmTypeCode);
  }

  async listRecentlyUpdatedByBusinessId(
    businessId: string,
    limit: number,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        id: crmRecord.id,
        businessId: crmRecord.businessId,
        partyId: crmRecord.partyId,
        customerNumber: crmRecord.customerNumber,
        crmTypeCode: crmRecord.crmTypeCode,
        statusCode: crmRecord.statusCode,
        ownerPartyId: crmRecord.ownerPartyId,
        relationshipManagerPartyId: crmRecord.relationshipManagerPartyId,
        branchId: crmRecord.branchId,
        sourceCode: crmRecord.sourceCode,
        customerSince: crmRecord.customerSince,
        recordSource: crmRecord.recordSource,
        legacyCode: crmRecord.legacyCode,
        legacySystem: crmRecord.legacySystem,
        migrationDate: crmRecord.migrationDate,
        migrationBatch: crmRecord.migrationBatch,
        metadata: crmRecord.metadata,
        createdAt: crmRecord.createdAt,
        createdBy: crmRecord.createdBy,
        updatedAt: crmRecord.updatedAt,
        updatedBy: crmRecord.updatedBy,
        deletedAt: crmRecord.deletedAt,
        version: crmRecord.version,
        partyDisplayName: party.displayName,
        partyTypeCode: party.partyTypeCode,
        partyNumber: party.partyNumber,
      })
      .from(crmRecord)
      .innerJoin(party, eq(crmRecord.partyId, party.id))
      .where(
        and(eq(crmRecord.businessId, businessId), isNull(crmRecord.deletedAt))
      )
      .orderBy(desc(crmRecord.updatedAt))
      .limit(limit);
  }

  async listJoined(
    businessId: string,
    filters: CrmRecordListQueryFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(crmRecord.businessId, businessId),
      isNull(crmRecord.deletedAt),
    ];

    if (filters.statusCode) {
      conditions.push(eq(crmRecord.statusCode, filters.statusCode));
    }

    if (filters.crmTypeCode) {
      conditions.push(eq(crmRecord.crmTypeCode, filters.crmTypeCode));
    }

    if (filters.ownerPartyId) {
      conditions.push(eq(crmRecord.ownerPartyId, filters.ownerPartyId));
    }

    if (filters.branchId) {
      conditions.push(eq(crmRecord.branchId, filters.branchId));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(crmRecord.customerNumber, pattern),
          ilike(party.displayName, pattern),
          ilike(party.partyNumber, pattern)
        )!
      );
    }

    const whereClause = and(...conditions);
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [totalRow] = await dbClient
      .select({ total: count() })
      .from(crmRecord)
      .innerJoin(party, eq(crmRecord.partyId, party.id))
      .where(whereClause);

    const rows = await dbClient
      .select({
        id: crmRecord.id,
        businessId: crmRecord.businessId,
        partyId: crmRecord.partyId,
        customerNumber: crmRecord.customerNumber,
        crmTypeCode: crmRecord.crmTypeCode,
        statusCode: crmRecord.statusCode,
        ownerPartyId: crmRecord.ownerPartyId,
        relationshipManagerPartyId: crmRecord.relationshipManagerPartyId,
        branchId: crmRecord.branchId,
        sourceCode: crmRecord.sourceCode,
        customerSince: crmRecord.customerSince,
        recordSource: crmRecord.recordSource,
        legacyCode: crmRecord.legacyCode,
        legacySystem: crmRecord.legacySystem,
        migrationDate: crmRecord.migrationDate,
        migrationBatch: crmRecord.migrationBatch,
        metadata: crmRecord.metadata,
        createdAt: crmRecord.createdAt,
        createdBy: crmRecord.createdBy,
        updatedAt: crmRecord.updatedAt,
        updatedBy: crmRecord.updatedBy,
        deletedAt: crmRecord.deletedAt,
        version: crmRecord.version,
        partyDisplayName: party.displayName,
        partyTypeCode: party.partyTypeCode,
        partyNumber: party.partyNumber,
      })
      .from(crmRecord)
      .innerJoin(party, eq(crmRecord.partyId, party.id))
      .where(whereClause)
      .orderBy(asc(party.displayName))
      .limit(limit)
      .offset(offset);

    return {
      rows,
      total: Number(totalRow?.total ?? 0),
      limit,
      offset,
    };
  }

  async searchByQuery(
    businessId: string,
    query: string,
    limit = 20,
    dbClient: DbClient = getDb()
  ) {
    const pattern = `%${query.trim()}%`;

    return dbClient
      .select({
        id: crmRecord.id,
        businessId: crmRecord.businessId,
        partyId: crmRecord.partyId,
        customerNumber: crmRecord.customerNumber,
        crmTypeCode: crmRecord.crmTypeCode,
        statusCode: crmRecord.statusCode,
        ownerPartyId: crmRecord.ownerPartyId,
        relationshipManagerPartyId: crmRecord.relationshipManagerPartyId,
        branchId: crmRecord.branchId,
        sourceCode: crmRecord.sourceCode,
        customerSince: crmRecord.customerSince,
        recordSource: crmRecord.recordSource,
        legacyCode: crmRecord.legacyCode,
        legacySystem: crmRecord.legacySystem,
        migrationDate: crmRecord.migrationDate,
        migrationBatch: crmRecord.migrationBatch,
        metadata: crmRecord.metadata,
        createdAt: crmRecord.createdAt,
        createdBy: crmRecord.createdBy,
        updatedAt: crmRecord.updatedAt,
        updatedBy: crmRecord.updatedBy,
        deletedAt: crmRecord.deletedAt,
        version: crmRecord.version,
        partyDisplayName: party.displayName,
        partyTypeCode: party.partyTypeCode,
        partyNumber: party.partyNumber,
      })
      .from(crmRecord)
      .innerJoin(party, eq(crmRecord.partyId, party.id))
      .where(
        and(
          eq(crmRecord.businessId, businessId),
          isNull(crmRecord.deletedAt),
          or(
            ilike(crmRecord.customerNumber, pattern),
            ilike(party.displayName, pattern),
            ilike(party.partyNumber, pattern)
          )
        )
      )
      .orderBy(sql`${party.displayName} asc`)
      .limit(limit);
  }
}

export function createCrmRecordRepository() {
  return new CrmRecordRepository();
}
