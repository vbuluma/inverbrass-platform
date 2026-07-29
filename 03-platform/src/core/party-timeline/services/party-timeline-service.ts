/**
 * Purpose:
 * Reusable Party Timeline orchestration — record and list events.
 *
 * Architecture:
 * Business Service → PartyTimelineService → PartyTimelineRepository → Database
 *
 * Business rules:
 * - Append-only — no updates or physical deletes from this service.
 * - recordEvent() never throws — timeline failures must not roll back transactions.
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import { inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import { platformUser } from "@/db/schema/platform-user";
import {
  PARTY_TIMELINE_CATEGORY_LABELS,
  PARTY_TIMELINE_DEFAULT_PAGE_SIZE,
  PARTY_TIMELINE_SOURCE_MODULE_LABELS,
  PARTY_TIMELINE_VISIBILITY,
} from "@/core/party-timeline/constants";
import {
  createPartyTimelineRepository,
  type PartyTimelineRepository,
} from "@/core/party-timeline/repositories/party-timeline-repository";
import type {
  PartyTimelineEventView,
  PartyTimelineFilterOptions,
  PartyTimelineListFilters,
  PartyTimelineListResult,
  RecordPartyTimelineEventPayload,
} from "@/core/party-timeline/types";

export class PartyTimelineService {
  constructor(
    private readonly repository: PartyTimelineRepository = createPartyTimelineRepository()
  ) {}

  /**
   * WHAT: Append a timeline event after a successful business transaction.
   * WHY: Central reusable entry point for all modules (BP-002 and future Build Packs).
   * NOTE: Swallows errors — callers must not depend on timeline success.
   */
  async recordEvent(payload: RecordPartyTimelineEventPayload): Promise<void> {
    try {
      await this.repository.insert({
        businessId: payload.businessId,
        partyId: payload.partyId,
        eventDateTime: payload.eventDateTime ?? new Date(),
        eventType: payload.eventType,
        eventCategory: payload.eventCategory,
        sourceModule: payload.sourceModule,
        referenceEntity: payload.referenceEntity ?? null,
        referenceId: payload.referenceId ?? null,
        summary: payload.summary.trim(),
        description: payload.description?.trim() || null,
        performedByUserId: payload.performedByUserId ?? null,
        performedByName: payload.performedByName?.trim() || null,
        visibility: payload.visibility ?? PARTY_TIMELINE_VISIBILITY.STANDARD,
        systemGenerated: payload.systemGenerated ?? true,
        metadata: payload.metadata ?? null,
        createdBy: payload.createdBy ?? payload.performedByUserId ?? null,
        updatedBy: payload.createdBy ?? payload.performedByUserId ?? null,
      });
    } catch (error) {
      const detail = {
        source: "BP-002-IP-010",
        engine: "party-timeline",
        eventType: payload.eventType,
        partyId: payload.partyId,
        businessId: payload.businessId,
        error: error instanceof Error ? error.message : String(error),
      };

      if (process.env.NODE_ENV === "production") {
        console.error(JSON.stringify(detail));
      } else {
        console.error("[party-timeline] Failed to record event:", detail);
      }
    }
  }

  async listEvents(
    businessId: string,
    partyId: string,
    filters: PartyTimelineListFilters = {}
  ): Promise<PartyTimelineListResult> {
    const pageSize = filters.limit ?? PARTY_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;
    const listFilters = { ...filters, limit: pageSize, offset };

    const [rows, totalCount] = await Promise.all([
      this.repository.listByPartyId(businessId, partyId, listFilters),
      this.repository.countByPartyId(businessId, partyId, {
        category: filters.category,
        sourceModule: filters.sourceModule,
        search: filters.search,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    ]);

    const performerIds = rows
      .filter((row) => !row.performedByName && row.performedByUserId)
      .map((row) => row.performedByUserId as string);

    const performerNames = await this.loadPerformerNames(performerIds);

    const events = rows.map((row) =>
      this.toEventView(row, performerNames)
    );

    return {
      events,
      totalCount,
      hasMore: offset + events.length < totalCount,
      pageSize,
      offset,
    };
  }

  async getFilterOptions(
    businessId: string,
    partyId: string
  ): Promise<PartyTimelineFilterOptions> {
    const [categories, sourceModules] = await Promise.all([
      this.repository.listDistinctCategoriesByPartyId(businessId, partyId),
      this.repository.listDistinctSourceModulesByPartyId(businessId, partyId),
    ]);

    return {
      categories: categories.map((code) => ({
        code,
        label: this.categoryLabel(code),
      })),
      sourceModules: sourceModules.map((code) => ({
        code,
        label: this.sourceModuleLabel(code),
      })),
    };
  }

  private categoryLabel(code: string): string {
    return (
      PARTY_TIMELINE_CATEGORY_LABELS[
        code as keyof typeof PARTY_TIMELINE_CATEGORY_LABELS
      ] ?? code.replace(/_/g, " ")
    );
  }

  private sourceModuleLabel(code: string): string {
    return (
      PARTY_TIMELINE_SOURCE_MODULE_LABELS[
        code as keyof typeof PARTY_TIMELINE_SOURCE_MODULE_LABELS
      ] ?? code.replace(/_/g, " ")
    );
  }

  private async loadPerformerNames(
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

  private toEventView(
    row: {
      id: string;
      eventDateTime: Date;
      eventType: string;
      eventCategory: string;
      sourceModule: string;
      referenceEntity: string | null;
      referenceId: string | null;
      summary: string;
      description: string | null;
      performedByUserId: string | null;
      performedByName: string | null;
      visibility: string;
      systemGenerated: boolean;
      metadata: unknown;
    },
    performerNames: Map<string, string>
  ): PartyTimelineEventView {
    const performedByName =
      row.performedByName?.trim() ||
      (row.performedByUserId
        ? performerNames.get(row.performedByUserId) ?? null
        : null);

    return {
      id: row.id,
      eventDateTime: row.eventDateTime.toISOString(),
      eventType: row.eventType,
      eventCategory: row.eventCategory,
      eventCategoryLabel: this.categoryLabel(row.eventCategory),
      sourceModule: row.sourceModule,
      sourceModuleLabel: this.sourceModuleLabel(row.sourceModule),
      referenceEntity: row.referenceEntity,
      referenceId: row.referenceId,
      summary: row.summary,
      description: row.description,
      performedByName,
      visibility: row.visibility,
      systemGenerated: row.systemGenerated,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
    };
  }
}

export function createPartyTimelineService(): PartyTimelineService {
  return new PartyTimelineService();
}
