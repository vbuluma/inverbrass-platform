/**
 * Purpose:
 * Persist and read Party Group rows (persistence only).
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyGroup } from "@/db/schema/party-group";
import { partyGroupMember } from "@/db/schema/party-group-member";
import {
  PARTY_GROUP_MEMBER_STATUS_CODES,
  PARTY_GROUP_STATUS_CODES,
  type PartyGroupStatusCode,
} from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyGroupInsertValues = {
  businessId: string;
  groupName: string;
  groupCode: string;
  groupTypeCode: string;
  statusCode: PartyGroupStatusCode;
  description?: string | null;
  countryCode?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyGroupUpdateValues = {
  groupName?: string;
  groupTypeCode?: string;
  statusCode?: PartyGroupStatusCode;
  description?: string | null;
  countryCode?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class PartyGroupRepository {
  async insert(values: PartyGroupInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(partyGroup)
      .values({
        businessId: values.businessId,
        groupName: values.groupName,
        groupCode: values.groupCode,
        groupTypeCode: values.groupTypeCode,
        statusCode: values.statusCode,
        description: values.description ?? null,
        countryCode: values.countryCode ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyGroupId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyGroup)
      .where(
        and(
          eq(partyGroup.businessId, businessId),
          eq(partyGroup.id, partyGroupId),
          isNull(partyGroup.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    businessId: string,
    groupCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyGroup)
      .where(
        and(
          eq(partyGroup.businessId, businessId),
          eq(partyGroup.groupCode, groupCode),
          isNull(partyGroup.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(partyGroup)
      .where(
        and(eq(partyGroup.businessId, businessId), isNull(partyGroup.deletedAt))
      )
      .orderBy(
        desc(partyGroup.statusCode),
        asc(partyGroup.groupName),
        asc(partyGroup.createdAt)
      );
  }

  async search(
    businessId: string,
    query: string,
    maxResults = 20,
    dbClient: DbClient = getDb()
  ) {
    const pattern = `%${query.trim()}%`;

    return dbClient
      .select()
      .from(partyGroup)
      .where(
        and(
          eq(partyGroup.businessId, businessId),
          eq(partyGroup.statusCode, PARTY_GROUP_STATUS_CODES.ACTIVE),
          isNull(partyGroup.deletedAt),
          or(
            ilike(partyGroup.groupName, pattern),
            ilike(partyGroup.groupCode, pattern)
          )
        )
      )
      .orderBy(asc(partyGroup.groupName))
      .limit(maxResults);
  }

  async countMembersByGroupIds(
    businessId: string,
    groupIds: string[],
    dbClient: DbClient = getDb()
  ) {
    if (groupIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await dbClient
      .select({
        partyGroupId: partyGroupMember.partyGroupId,
        count: sql<number>`count(*)::int`,
      })
      .from(partyGroupMember)
      .where(
        and(
          eq(partyGroupMember.businessId, businessId),
          eq(
            partyGroupMember.statusCode,
            PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
          ),
          isNull(partyGroupMember.deletedAt),
          inArray(partyGroupMember.partyGroupId, groupIds)
        )
      )
      .groupBy(partyGroupMember.partyGroupId);

    return new Map(rows.map((row) => [row.partyGroupId, row.count]));
  }

  async updateById(
    businessId: string,
    partyGroupId: string,
    values: PartyGroupUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyGroup)
      .set({
        ...(values.groupName !== undefined
          ? { groupName: values.groupName }
          : {}),
        ...(values.groupTypeCode !== undefined
          ? { groupTypeCode: values.groupTypeCode }
          : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.description !== undefined
          ? { description: values.description }
          : {}),
        ...(values.countryCode !== undefined
          ? { countryCode: values.countryCode }
          : {}),
        ...(values.deletedAt !== undefined
          ? { deletedAt: values.deletedAt }
          : {}),
        ...(values.updatedBy !== undefined
          ? { updatedBy: values.updatedBy }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyGroup.businessId, businessId),
          eq(partyGroup.id, partyGroupId),
          isNull(partyGroup.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyGroupRepository(): PartyGroupRepository {
  return new PartyGroupRepository();
}
