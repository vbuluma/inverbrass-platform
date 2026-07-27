/**
 * Purpose:
 * Persist and read Party Role assignment rows.
 *
 * Architecture:
 * PartyRoleService → PartyRoleRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-002 – Party Roles
 */

import { and, asc, count, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyRole } from "@/db/schema/party-role";
import { roleType } from "@/db/schema/role-type";
import {
  PARTY_ROLE_STATUS_CODES,
  type PartyRoleStatusCode,
} from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyRoleInsertValues = {
  businessId: string;
  partyId: string;
  roleTypeCode: string;
  statusCode: PartyRoleStatusCode;
  isPrimary: boolean;
  effectiveDate: string;
  endDate?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyRoleUpdateValues = {
  statusCode?: PartyRoleStatusCode;
  isPrimary?: boolean;
  effectiveDate?: string;
  endDate?: string | null;
  updatedBy?: string | null;
};

export class PartyRoleRepository {
  async insert(values: PartyRoleInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(partyRole)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        roleTypeCode: values.roleTypeCode,
        statusCode: values.statusCode,
        isPrimary: values.isPrimary,
        effectiveDate: values.effectiveDate,
        endDate: values.endDate ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyRoleId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyRole)
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.id, partyRoleId)
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
      .from(partyRole)
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.partyId, partyId)
        )
      )
      .orderBy(desc(partyRole.isPrimary), asc(partyRole.effectiveDate));
  }

  async findActiveByPartyAndRoleType(
    businessId: string,
    partyId: string,
    roleTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyRole)
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.partyId, partyId),
          eq(partyRole.roleTypeCode, roleTypeCode),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async clearPrimaryForParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .update(partyRole)
      .set({
        isPrimary: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.partyId, partyId),
          eq(partyRole.isPrimary, true),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      );
  }

  async updateById(
    businessId: string,
    partyRoleId: string,
    values: PartyRoleUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyRole)
      .set({
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.isPrimary !== undefined
          ? { isPrimary: values.isPrimary }
          : {}),
        ...(values.effectiveDate !== undefined
          ? { effectiveDate: values.effectiveDate }
          : {}),
        ...(values.endDate !== undefined ? { endDate: values.endDate } : {}),
        ...(values.updatedBy !== undefined
          ? { updatedBy: values.updatedBy }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.id, partyRoleId)
        )
      )
      .returning();

    return row ?? null;
  }

  async countActiveByRoleTypeForBusiness(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        roleTypeCode: partyRole.roleTypeCode,
        roleTypeName: roleType.name,
        value: count(),
      })
      .from(partyRole)
      .innerJoin(roleType, eq(roleType.code, partyRole.roleTypeCode))
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      )
      .groupBy(partyRole.roleTypeCode, roleType.name, roleType.displayOrder)
      .orderBy(asc(roleType.displayOrder), asc(roleType.name));
  }

  async countActiveRolesForParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(partyRole)
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.partyId, partyId),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      );

    return Number(row?.value ?? 0);
  }
}

export function createPartyRoleRepository(): PartyRoleRepository {
  return new PartyRoleRepository();
}
