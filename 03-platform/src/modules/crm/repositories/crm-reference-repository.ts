/**
 * Purpose:
 * Read CRM reference catalogues and lookup options.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { branch } from "@/db/schema/branch";
import { crmStatus } from "@/db/schema/crm-status";
import { crmType } from "@/db/schema/crm-type";
import { party } from "@/db/schema/party";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmReferenceRepository {
  async listActiveCrmTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmType.code,
        name: crmType.name,
        description: crmType.description,
      })
      .from(crmType)
      .where(eq(crmType.isActive, true))
      .orderBy(asc(crmType.displayOrder), asc(crmType.name));
  }

  async listActiveCrmStatuses(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmStatus.code,
        name: crmStatus.name,
        description: crmStatus.description,
      })
      .from(crmStatus)
      .where(eq(crmStatus.isActive, true))
      .orderBy(asc(crmStatus.displayOrder), asc(crmStatus.name));
  }

  async isActiveCrmType(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: crmType.code })
      .from(crmType)
      .where(and(eq(crmType.code, code), eq(crmType.isActive, true)))
      .limit(1);

    return Boolean(row);
  }

  async getCrmTypeName(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ name: crmType.name })
      .from(crmType)
      .where(eq(crmType.code, code))
      .limit(1);

    return row?.name ?? code;
  }

  async getCrmStatusName(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ name: crmStatus.name })
      .from(crmStatus)
      .where(eq(crmStatus.code, code))
      .limit(1);

    return row?.name ?? code;
  }

  async listOwnerPartyOptions(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        partyId: party.id,
        partyNumber: party.partyNumber,
        displayName: party.displayName,
        partyTypeCode: party.partyTypeCode,
      })
      .from(party)
      .where(and(eq(party.businessId, businessId), isNull(party.deletedAt)))
      .orderBy(asc(party.displayName))
      .limit(200);
  }

  async findParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
        partyNumber: party.partyNumber,
        partyTypeCode: party.partyTypeCode,
      })
      .from(party)
      .where(
        and(
          eq(party.businessId, businessId),
          eq(party.id, partyId),
          isNull(party.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findPartyDisplayName(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const row = await this.findParty(businessId, partyId, dbClient);
    return row?.displayName ?? null;
  }

  async listBranchOptions(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
      })
      .from(branch)
      .where(and(eq(branch.businessId, businessId), eq(branch.isActive, true)))
      .orderBy(asc(branch.name));
  }

  async getBranchName(
    businessId: string,
    branchId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ name: branch.name })
      .from(branch)
      .where(
        and(
          eq(branch.businessId, businessId),
          eq(branch.id, branchId),
          eq(branch.isActive, true)
        )
      )
      .limit(1);

    return row?.name ?? null;
  }
}

export function createCrmReferenceRepository() {
  return new CrmReferenceRepository();
}
