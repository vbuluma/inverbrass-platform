/**
 * Purpose:
 * Persist and read audit_history rows (persistence only).
 *
 * Architecture:
 * AuditService → AuditHistoryRepository → Drizzle
 *
 * Business rules:
 * - Insert only — no update or delete methods.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { auditHistory } from "@/db/schema/audit-history";
import { AUDIT_DEFAULT_PAGE_SIZE } from "@/core/audit/constants";
import type { AuditHistoryListFilters } from "@/core/audit/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type AuditHistoryInsertValues = {
  businessId: string;
  partyId?: string | null;
  entityName: string;
  entityId: string;
  operation: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  changedDateTime: Date;
  sourceModule: string;
  correlationId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  browserClient?: string | null;
  device?: string | null;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  retentionFlag?: boolean;
};

export class AuditHistoryRepository {
  async insert(
    values: AuditHistoryInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(auditHistory)
      .values({
        businessId: values.businessId,
        partyId: values.partyId ?? null,
        entityName: values.entityName,
        entityId: values.entityId,
        operation: values.operation,
        fieldName: values.fieldName ?? null,
        oldValue: values.oldValue ?? null,
        newValue: values.newValue ?? null,
        changedBy: values.changedBy ?? null,
        changedDateTime: values.changedDateTime,
        sourceModule: values.sourceModule,
        correlationId: values.correlationId ?? null,
        requestId: values.requestId ?? null,
        ipAddress: values.ipAddress ?? null,
        browserClient: values.browserClient ?? null,
        device: values.device ?? null,
        systemGenerated: values.systemGenerated ?? true,
        metadata: values.metadata ?? null,
        retentionFlag: values.retentionFlag ?? false,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    auditId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(auditHistory)
      .where(
        and(
          eq(auditHistory.businessId, businessId),
          eq(auditHistory.id, auditId)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByCorrelationId(
    businessId: string,
    correlationId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(auditHistory)
      .where(
        and(
          eq(auditHistory.businessId, businessId),
          eq(auditHistory.correlationId, correlationId)
        )
      )
      .orderBy(auditHistory.fieldName);
  }

  private buildPartyListConditions(
    businessId: string,
    partyId: string,
    filters: AuditHistoryListFilters
  ) {
    const conditions = [
      eq(auditHistory.businessId, businessId),
      eq(auditHistory.partyId, partyId),
    ];

    if (filters.operation?.trim()) {
      conditions.push(eq(auditHistory.operation, filters.operation.trim()));
    }

    if (filters.entityName?.trim()) {
      conditions.push(
        eq(auditHistory.entityName, filters.entityName.trim())
      );
    }

    if (filters.changedBy?.trim()) {
      conditions.push(eq(auditHistory.changedBy, filters.changedBy.trim()));
    }

    if (filters.dateFrom?.trim()) {
      conditions.push(
        gte(auditHistory.changedDateTime, new Date(filters.dateFrom.trim()))
      );
    }

    if (filters.dateTo?.trim()) {
      const end = new Date(filters.dateTo.trim());
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(auditHistory.changedDateTime, end));
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(auditHistory.fieldName, term),
          ilike(auditHistory.oldValue, term),
          ilike(auditHistory.newValue, term),
          ilike(auditHistory.entityName, term),
          ilike(auditHistory.operation, term)
        )!
      );
    }

    return and(...conditions);
  }

  async countByPartyId(
    businessId: string,
    partyId: string,
    filters: AuditHistoryListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const [result] = await dbClient
      .select({ value: count() })
      .from(auditHistory)
      .where(this.buildPartyListConditions(businessId, partyId, filters));

    return Number(result?.value ?? 0);
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    filters: AuditHistoryListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? AUDIT_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;

    return dbClient
      .select()
      .from(auditHistory)
      .where(this.buildPartyListConditions(businessId, partyId, filters))
      .orderBy(desc(auditHistory.changedDateTime), desc(auditHistory.id))
      .limit(limit)
      .offset(offset);
  }

  async listDistinctOperationsByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ operation: auditHistory.operation })
      .from(auditHistory)
      .where(
        and(
          eq(auditHistory.businessId, businessId),
          eq(auditHistory.partyId, partyId)
        )
      )
      .orderBy(auditHistory.operation);

    return rows.map((row) => row.operation);
  }

  async listDistinctEntitiesByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ entityName: auditHistory.entityName })
      .from(auditHistory)
      .where(
        and(
          eq(auditHistory.businessId, businessId),
          eq(auditHistory.partyId, partyId)
        )
      )
      .orderBy(auditHistory.entityName);

    return rows.map((row) => row.entityName);
  }

  async listDistinctUsersByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ changedBy: auditHistory.changedBy })
      .from(auditHistory)
      .where(
        and(
          eq(auditHistory.businessId, businessId),
          eq(auditHistory.partyId, partyId)
        )
      )
      .orderBy(auditHistory.changedBy);

    return rows
      .map((row) => row.changedBy)
      .filter((id): id is string => Boolean(id));
  }
}

export function createAuditHistoryRepository(): AuditHistoryRepository {
  return new AuditHistoryRepository();
}
