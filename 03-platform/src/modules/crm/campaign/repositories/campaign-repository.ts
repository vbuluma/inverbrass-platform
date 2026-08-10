/**
 * Purpose:
 * Persist and read campaign header rows (persistence only).
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { campaign } from "@/db/schema/campaign";
import type {
  CampaignInsertValues,
  CampaignSearchFilters,
  CampaignUpdateValues,
} from "@/modules/crm/campaign/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CampaignRepository {
  async insert(values: CampaignInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(campaign)
      .values({
        businessId: values.businessId,
        campaignNumber: values.campaignNumber,
        name: values.name,
        campaignType: values.campaignType,
        status: values.status,
        startAt: values.startAt ?? null,
        endAt: values.endAt ?? null,
        budgetAmount: values.budgetAmount ?? "0",
        actualCost: values.actualCost ?? "0",
        currencyCode: values.currencyCode,
        objective: values.objective ?? null,
        ownerUserId: values.ownerUserId ?? null,
        partyGroupId: values.partyGroupId ?? null,
        expectedResponseCount: values.expectedResponseCount ?? 0,
        notes: values.notes ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    campaignId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(campaign)
      .where(
        and(
          eq(campaign.businessId, businessId),
          eq(campaign.id, campaignId),
          isNull(campaign.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async update(
    businessId: string,
    campaignId: string,
    values: CampaignUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(campaign)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(campaign.businessId, businessId),
          eq(campaign.id, campaignId),
          isNull(campaign.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async search(
    businessId: string,
    filters: CampaignSearchFilters,
    dbClient: DbClient = getDb()
  ) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const offset = (page - 1) * pageSize;

    const conditions = [
      eq(campaign.businessId, businessId),
      isNull(campaign.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(campaign.status, filters.status));
    }
    if (filters.campaignType) {
      conditions.push(eq(campaign.campaignType, filters.campaignType));
    }
    if (filters.ownerUserId) {
      conditions.push(eq(campaign.ownerUserId, filters.ownerUserId));
    }
    if (filters.partyGroupId) {
      conditions.push(eq(campaign.partyGroupId, filters.partyGroupId));
    }
    if (filters.query?.trim()) {
      const q = `%${filters.query.trim()}%`;
      conditions.push(
        or(ilike(campaign.name, q), ilike(campaign.campaignNumber, q))!
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(campaign)
      .where(whereClause);

    const items = await dbClient
      .select()
      .from(campaign)
      .where(whereClause)
      .orderBy(desc(campaign.updatedAt))
      .limit(pageSize)
      .offset(offset);

    return {
      items,
      totalCount: countRow?.count ?? 0,
      page,
      pageSize,
    };
  }

  async countByStatus(
    businessId: string,
    status: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(campaign)
      .where(
        and(
          eq(campaign.businessId, businessId),
          eq(campaign.status, status),
          isNull(campaign.deletedAt)
        )
      );

    return row?.count ?? 0;
  }

  async sumBudget(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        total: sql<string>`coalesce(sum(${campaign.budgetAmount}), 0)`,
      })
      .from(campaign)
      .where(and(eq(campaign.businessId, businessId), isNull(campaign.deletedAt)));

    return Number(row?.total ?? 0);
  }

  async nextSequence(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(campaign)
      .where(eq(campaign.businessId, businessId));

    return (row?.count ?? 0) + 1;
  }
}

export function createCampaignRepository() {
  return new CampaignRepository();
}
