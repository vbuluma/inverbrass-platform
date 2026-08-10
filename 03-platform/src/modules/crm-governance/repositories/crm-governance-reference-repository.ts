/**
 * Supporting reads for CRM governance evaluation (party, activities, cases).
 */

import { and, eq, ilike, isNull, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmActivity } from "@/db/schema/crm-activity";
import { crmCase } from "@/db/schema/crm-case";
import { party } from "@/db/schema/party";
import { CRM_CASE_OPEN_STATUS_CODES } from "@/modules/crm-case/constants";
import { createCrmActivityReferenceRepository } from "@/modules/crm-activity/repositories/crm-activity-reference-repository";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmGovernanceReferenceRepository {
  private readonly ownerReference = createCrmActivityReferenceRepository();

  async findParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
        statusCode: party.statusCode,
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

  async listOwnerOptions(businessId: string) {
    const owners = await this.ownerReference.listActiveOwners(businessId);
    return owners.map((owner) => ({
      id: owner.id,
      label:
        owner.displayName?.trim() ||
        `${owner.firstName} ${owner.lastName}`.trim(),
    }));
  }

  async getOwnerDisplayName(userId: string) {
    return this.ownerReference.getOwnerDisplayName(userId);
  }

  async isOwnerAssignable(businessId: string, userId: string) {
    return this.ownerReference.isOwnerAssignable(businessId, userId);
  }

  async countActivitiesForParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(crmActivity)
      .where(
        and(
          eq(crmActivity.businessId, businessId),
          eq(crmActivity.primaryPartyId, partyId),
          isNull(crmActivity.deletedAt)
        )
      );
    return Number(row?.count ?? 0);
  }

  async countOverdueOpenCasesForParty(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(crmCase)
      .where(
        and(
          eq(crmCase.businessId, businessId),
          eq(crmCase.primaryPartyId, partyId),
          isNull(crmCase.deletedAt),
          sql`${crmCase.statusCode} in (${sql.join(
            CRM_CASE_OPEN_STATUS_CODES.map((code) => sql`${code}`),
            sql`, `
          )})`,
          lt(crmCase.slaResolutionDueAt, new Date())
        )
      );
    return Number(row?.count ?? 0);
  }

  async findSimilarParties(
    businessId: string,
    partyId: string,
    displayName: string,
    dbClient: DbClient = getDb()
  ) {
    const trimmed = displayName.trim();
    if (trimmed.length < 3) {
      return [];
    }

    const pattern = `%${trimmed}%`;
    return dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .where(
        and(
          eq(party.businessId, businessId),
          isNull(party.deletedAt),
          sql`${party.id} <> ${partyId}`,
          ilike(party.displayName, pattern)
        )
      )
      .limit(20);
  }
}

export function createCrmGovernanceReferenceRepository() {
  return new CrmGovernanceReferenceRepository();
}
