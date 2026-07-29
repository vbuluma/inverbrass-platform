/**
 * Purpose:
 * Persist and read Party Timeline rows (persistence only).
 *
 * Architecture:
 * PartyTimelineService → PartyTimelineRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-010 – Party Timeline & Activity History
 */

import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyTimeline } from "@/db/schema/party-timeline";
import {
  PARTY_TIMELINE_DEFAULT_PAGE_SIZE,
  PARTY_TIMELINE_VISIBILITY,
} from "@/core/party-timeline/constants";
import type { PartyTimelineListFilters } from "@/core/party-timeline/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyTimelineInsertValues = {
  businessId: string;
  partyId: string;
  eventDateTime: Date;
  eventType: string;
  eventCategory: string;
  sourceModule: string;
  referenceEntity?: string | null;
  referenceId?: string | null;
  summary: string;
  description?: string | null;
  performedByUserId?: string | null;
  performedByName?: string | null;
  visibility: string;
  systemGenerated?: boolean;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export class PartyTimelineRepository {
  async insert(
    values: PartyTimelineInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyTimeline)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        eventDateTime: values.eventDateTime,
        eventType: values.eventType,
        eventCategory: values.eventCategory,
        sourceModule: values.sourceModule,
        referenceEntity: values.referenceEntity ?? null,
        referenceId: values.referenceId ?? null,
        summary: values.summary,
        description: values.description ?? null,
        performedByUserId: values.performedByUserId ?? null,
        performedByName: values.performedByName ?? null,
        visibility: values.visibility,
        systemGenerated: values.systemGenerated ?? true,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyTimelineId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyTimeline)
      .where(
        and(
          eq(partyTimeline.businessId, businessId),
          eq(partyTimeline.id, partyTimelineId),
          isNull(partyTimeline.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  private buildListConditions(
    businessId: string,
    partyId: string,
    filters: PartyTimelineListFilters
  ) {
    const conditions = [
      eq(partyTimeline.businessId, businessId),
      eq(partyTimeline.partyId, partyId),
      isNull(partyTimeline.deletedAt),
      eq(partyTimeline.visibility, PARTY_TIMELINE_VISIBILITY.STANDARD),
    ];

    if (filters.category?.trim()) {
      conditions.push(eq(partyTimeline.eventCategory, filters.category.trim()));
    }

    if (filters.sourceModule?.trim()) {
      conditions.push(
        eq(partyTimeline.sourceModule, filters.sourceModule.trim())
      );
    }

    if (filters.dateFrom?.trim()) {
      conditions.push(
        gte(partyTimeline.eventDateTime, new Date(filters.dateFrom.trim()))
      );
    }

    if (filters.dateTo?.trim()) {
      const end = new Date(filters.dateTo.trim());
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(partyTimeline.eventDateTime, end));
    }

    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(partyTimeline.summary, term),
          ilike(partyTimeline.description, term),
          ilike(partyTimeline.eventType, term)
        )!
      );
    }

    return and(...conditions);
  }

  async countByPartyId(
    businessId: string,
    partyId: string,
    filters: PartyTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const [result] = await dbClient
      .select({ value: count() })
      .from(partyTimeline)
      .where(this.buildListConditions(businessId, partyId, filters));

    return Number(result?.value ?? 0);
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    filters: PartyTimelineListFilters = {},
    dbClient: DbClient = getDb()
  ) {
    const limit = filters.limit ?? PARTY_TIMELINE_DEFAULT_PAGE_SIZE;
    const offset = filters.offset ?? 0;

    return dbClient
      .select()
      .from(partyTimeline)
      .where(this.buildListConditions(businessId, partyId, filters))
      .orderBy(desc(partyTimeline.eventDateTime), desc(partyTimeline.id))
      .limit(limit)
      .offset(offset);
  }

  async listDistinctCategoriesByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ eventCategory: partyTimeline.eventCategory })
      .from(partyTimeline)
      .where(
        and(
          eq(partyTimeline.businessId, businessId),
          eq(partyTimeline.partyId, partyId),
          isNull(partyTimeline.deletedAt),
          eq(partyTimeline.visibility, PARTY_TIMELINE_VISIBILITY.STANDARD)
        )
      )
      .orderBy(partyTimeline.eventCategory);

    return rows.map((row) => row.eventCategory);
  }

  async listDistinctSourceModulesByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .selectDistinct({ sourceModule: partyTimeline.sourceModule })
      .from(partyTimeline)
      .where(
        and(
          eq(partyTimeline.businessId, businessId),
          eq(partyTimeline.partyId, partyId),
          isNull(partyTimeline.deletedAt),
          eq(partyTimeline.visibility, PARTY_TIMELINE_VISIBILITY.STANDARD)
        )
      )
      .orderBy(partyTimeline.sourceModule);

    return rows.map((row) => row.sourceModule);
  }
}

export function createPartyTimelineRepository(): PartyTimelineRepository {
  return new PartyTimelineRepository();
}
