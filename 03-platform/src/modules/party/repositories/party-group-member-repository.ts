/**
 * Purpose:
 * Persist and read Party Group Member rows (persistence only).
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyGroupMember } from "@/db/schema/party-group-member";
import {
  PARTY_GROUP_MEMBER_STATUS_CODES,
  type PartyGroupMemberStatusCode,
} from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyGroupMemberInsertValues = {
  businessId: string;
  partyGroupId: string;
  partyId: string;
  membershipRoleCode: string;
  joinDate: string;
  exitDate?: string | null;
  statusCode: PartyGroupMemberStatusCode;
  isPrimaryContact?: boolean;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyGroupMemberUpdateValues = {
  membershipRoleCode?: string;
  joinDate?: string;
  exitDate?: string | null;
  statusCode?: PartyGroupMemberStatusCode;
  isPrimaryContact?: boolean;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class PartyGroupMemberRepository {
  async insert(
    values: PartyGroupMemberInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyGroupMember)
      .values({
        businessId: values.businessId,
        partyGroupId: values.partyGroupId,
        partyId: values.partyId,
        membershipRoleCode: values.membershipRoleCode,
        joinDate: values.joinDate,
        exitDate: values.exitDate ?? null,
        statusCode: values.statusCode,
        isPrimaryContact: values.isPrimaryContact ?? false,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyGroupMemberId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyGroupMember)
      .where(
        and(
          eq(partyGroupMember.businessId, businessId),
          eq(partyGroupMember.id, partyGroupMemberId),
          isNull(partyGroupMember.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(partyGroupMember)
      .where(
        and(
          eq(partyGroupMember.businessId, businessId),
          eq(partyGroupMember.partyId, partyId),
          isNull(partyGroupMember.deletedAt)
        )
      )
      .orderBy(
        desc(partyGroupMember.statusCode),
        desc(partyGroupMember.joinDate),
        asc(partyGroupMember.createdAt)
      );
  }

  async listByGroupId(
    businessId: string,
    partyGroupId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(partyGroupMember)
      .where(
        and(
          eq(partyGroupMember.businessId, businessId),
          eq(partyGroupMember.partyGroupId, partyGroupId),
          isNull(partyGroupMember.deletedAt)
        )
      )
      .orderBy(
        desc(partyGroupMember.statusCode),
        desc(partyGroupMember.joinDate),
        asc(partyGroupMember.createdAt)
      );
  }

  async findActiveByGroupAndParty(
    businessId: string,
    partyGroupId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyGroupMember)
      .where(
        and(
          eq(partyGroupMember.businessId, businessId),
          eq(partyGroupMember.partyGroupId, partyGroupId),
          eq(partyGroupMember.partyId, partyId),
          eq(
            partyGroupMember.statusCode,
            PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE
          ),
          isNull(partyGroupMember.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async countByGroupId(
    businessId: string,
    partyGroupId: string,
    statusCode?: PartyGroupMemberStatusCode,
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(partyGroupMember.businessId, businessId),
      eq(partyGroupMember.partyGroupId, partyGroupId),
      isNull(partyGroupMember.deletedAt),
    ];

    if (statusCode) {
      conditions.push(eq(partyGroupMember.statusCode, statusCode));
    }

    const rows = await dbClient
      .select({ id: partyGroupMember.id })
      .from(partyGroupMember)
      .where(and(...conditions));

    return rows.length;
  }

  async updateById(
    businessId: string,
    partyGroupMemberId: string,
    values: PartyGroupMemberUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyGroupMember)
      .set({
        ...(values.membershipRoleCode !== undefined
          ? { membershipRoleCode: values.membershipRoleCode }
          : {}),
        ...(values.joinDate !== undefined ? { joinDate: values.joinDate } : {}),
        ...(values.exitDate !== undefined ? { exitDate: values.exitDate } : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.isPrimaryContact !== undefined
          ? { isPrimaryContact: values.isPrimaryContact }
          : {}),
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
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
          eq(partyGroupMember.businessId, businessId),
          eq(partyGroupMember.id, partyGroupMemberId),
          isNull(partyGroupMember.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyGroupMemberRepository(): PartyGroupMemberRepository {
  return new PartyGroupMemberRepository();
}
