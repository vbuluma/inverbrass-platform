/**
 * Purpose:
 * Reusable Enterprise Audit orchestration — record and list immutable changes.
 *
 * Architecture:
 * Business Service → AuditService → AuditHistoryRepository → Database
 *
 * Business rules:
 * - Append-only — no updates or deletes from this service.
 * - record() never throws — audit failures must not roll back transactions.
 *
 * Implementation Package:
 * BP-002 / IP-011 – Enterprise Audit History
 */

import { inArray } from "drizzle-orm";

import {
  AUDIT_DEFAULT_PAGE_SIZE,
  AUDIT_ENTITY_LABELS,
  AUDIT_OPERATION_LABELS,
  AUDIT_SOURCE_MODULE_LABELS,
} from "@/core/audit/constants";
import {
  createAuditHistoryRepository,
  type AuditHistoryRepository,
} from "@/core/audit/repositories/audit-history-repository";
import type {
  AuditHistoryDetailView,
  AuditHistoryEntryView,
  AuditHistoryFilterOptions,
  AuditHistoryListFilters,
  AuditHistoryListResult,
  RecordAuditPayload,
} from "@/core/audit/types";
import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";

export class AuditService {
  constructor(
    private readonly repository: AuditHistoryRepository = createAuditHistoryRepository()
  ) {}

  /**
   * WHAT: Append audit entries after a successful business transaction.
   * WHY: Central reusable entry point for all modules (BP-002 and future Build Packs).
   * NOTE: Swallows errors — callers must not depend on audit success.
   */
  async record(payload: RecordAuditPayload): Promise<void> {
    try {
      const correlationId = payload.correlationId ?? crypto.randomUUID();
      const changes = payload.changes ?? [];

      if (changes.length === 0) {
        await this.repository.insert({
          businessId: payload.businessId,
          partyId: payload.partyId,
          entityName: payload.entityName,
          entityId: payload.entityId,
          operation: payload.operation,
          fieldName: null,
          oldValue: null,
          newValue: null,
          changedBy: payload.changedBy,
          changedDateTime: payload.changedDateTime ?? new Date(),
          sourceModule: payload.sourceModule,
          correlationId,
          requestId: payload.requestId,
          ipAddress: payload.ipAddress,
          browserClient: payload.browserClient,
          device: payload.device,
          systemGenerated: payload.systemGenerated ?? true,
          metadata: payload.metadata,
          retentionFlag: payload.retentionFlag ?? false,
        });
        return;
      }

      for (const change of changes) {
        await this.repository.insert({
          businessId: payload.businessId,
          partyId: payload.partyId,
          entityName: payload.entityName,
          entityId: payload.entityId,
          operation: payload.operation,
          fieldName: change.fieldName,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changedBy: payload.changedBy,
          changedDateTime: payload.changedDateTime ?? new Date(),
          sourceModule: payload.sourceModule,
          correlationId,
          requestId: payload.requestId,
          ipAddress: payload.ipAddress,
          browserClient: payload.browserClient,
          device: payload.device,
          systemGenerated: payload.systemGenerated ?? true,
          metadata: payload.metadata,
          retentionFlag: payload.retentionFlag ?? false,
        });
      }
    } catch (error) {
      const detail = {
        source: "BP-002-IP-011",
        engine: "audit",
        operation: payload.operation,
        entityName: payload.entityName,
        entityId: payload.entityId,
        businessId: payload.businessId,
        error: error instanceof Error ? error.message : String(error),
      };

      if (process.env.NODE_ENV === "production") {
        console.error(JSON.stringify(detail));
      } else {
        console.error("[audit] Failed to record entry:", detail);
      }
    }
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    filters: AuditHistoryListFilters = {}
  ): Promise<AuditHistoryListResult> {
    const pageSize = filters.limit ?? AUDIT_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;
    const listFilters = { ...filters, limit: pageSize, offset };

    const [rows, totalCount] = await Promise.all([
      this.repository.listByPartyId(businessId, partyId, listFilters),
      this.repository.countByPartyId(businessId, partyId, {
        operation: filters.operation,
        entityName: filters.entityName,
        changedBy: filters.changedBy,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    ]);

    const userIds = rows
      .map((row) => row.changedBy)
      .filter((id): id is string => Boolean(id));

    const userNames = await this.loadUserNames(userIds);
    const entries = rows.map((row) => this.toEntryView(row, userNames));

    return {
      entries,
      totalCount,
      hasMore: offset + entries.length < totalCount,
      pageSize,
      offset,
    };
  }

  async getEntryDetail(
    businessId: string,
    auditId: string
  ): Promise<AuditHistoryDetailView | null> {
    const row = await this.repository.findById(businessId, auditId);
    if (!row) {
      return null;
    }

    const userNames = await this.loadUserNames(
      row.changedBy ? [row.changedBy] : []
    );
    const entry = this.toEntryView(row, userNames);

    let relatedChanges: AuditHistoryEntryView[] = [];
    if (row.correlationId) {
      const relatedRows = await this.repository.listByCorrelationId(
        businessId,
        row.correlationId
      );
      const relatedUserIds = relatedRows
        .map((related) => related.changedBy)
        .filter((id): id is string => Boolean(id));
      const relatedUserNames = await this.loadUserNames(relatedUserIds);
      relatedChanges = relatedRows
        .filter((related) => related.id !== row.id)
        .map((related) => this.toEntryView(related, relatedUserNames));
    }

    return {
      ...entry,
      changedByUserId: row.changedBy,
      requestId: row.requestId,
      relatedChanges,
    };
  }

  async getFilterOptions(
    businessId: string,
    partyId: string
  ): Promise<AuditHistoryFilterOptions> {
    const [operations, entities, userIds] = await Promise.all([
      this.repository.listDistinctOperationsByPartyId(businessId, partyId),
      this.repository.listDistinctEntitiesByPartyId(businessId, partyId),
      this.repository.listDistinctUsersByPartyId(businessId, partyId),
    ]);

    const userNames = await this.loadUserNames(userIds);

    return {
      operations: operations.map((code) => ({
        code,
        label: this.operationLabel(code),
      })),
      entities: entities.map((code) => ({
        code,
        label: this.entityLabel(code),
      })),
      users: userIds.map((id) => ({
        id,
        name: userNames.get(id) ?? id,
      })),
    };
  }

  private operationLabel(code: string): string {
    return (
      AUDIT_OPERATION_LABELS[
        code as keyof typeof AUDIT_OPERATION_LABELS
      ] ?? code.replace(/_/g, " ")
    );
  }

  private entityLabel(code: string): string {
    return (
      AUDIT_ENTITY_LABELS[code as keyof typeof AUDIT_ENTITY_LABELS] ??
      code.replace(/_/g, " ")
    );
  }

  private sourceModuleLabel(code: string): string {
    return (
      AUDIT_SOURCE_MODULE_LABELS[
        code as keyof typeof AUDIT_SOURCE_MODULE_LABELS
      ] ?? code.replace(/_/g, " ")
    );
  }

  private async loadUserNames(
    platformUserIds: string[]
  ): Promise<Map<string, string>> {
    if (platformUserIds.length === 0) {
      return new Map();
    }

    const uniqueIds = [...new Set(platformUserIds)];
    const rows = await getDb()
      .select({
        id: platformUser.id,
        displayName: platformUser.displayName,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
      })
      .from(platformUser)
      .where(inArray(platformUser.id, uniqueIds));

    return new Map(
      rows.map((row) => [
        row.id,
        row.displayName?.trim() ||
          `${row.firstName} ${row.lastName}`.trim(),
      ])
    );
  }

  private toEntryView(
    row: {
      id: string;
      changedDateTime: Date;
      changedBy: string | null;
      operation: string;
      entityName: string;
      entityId: string;
      fieldName: string | null;
      oldValue: string | null;
      newValue: string | null;
      sourceModule: string;
      correlationId: string | null;
      systemGenerated: boolean;
      metadata: unknown;
      ipAddress: string | null;
      browserClient: string | null;
      device: string | null;
    },
    userNames: Map<string, string>
  ): AuditHistoryEntryView {
    return {
      id: row.id,
      changedDateTime: row.changedDateTime.toISOString(),
      changedByName: row.changedBy
        ? userNames.get(row.changedBy) ?? null
        : null,
      operation: row.operation,
      operationLabel: this.operationLabel(row.operation),
      entityName: row.entityName,
      entityLabel: this.entityLabel(row.entityName),
      entityId: row.entityId,
      fieldName: row.fieldName,
      oldValue: row.oldValue,
      newValue: row.newValue,
      sourceModule: row.sourceModule,
      sourceModuleLabel: this.sourceModuleLabel(row.sourceModule),
      correlationId: row.correlationId,
      systemGenerated: row.systemGenerated,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
      ipAddress: row.ipAddress,
      browserClient: row.browserClient,
      device: row.device,
    };
  }
}

export function createAuditService(): AuditService {
  return new AuditService();
}
