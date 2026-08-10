/**
 * Purpose:
 * Persist and read campaign member rows (persistence only).
 *
 * Implementation Package:
 * BP-004 / IP-11 – Campaign Management
 */

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { campaignMember } from "@/db/schema/campaign";
import { party } from "@/db/schema/party";
import type {
  CampaignMemberInsertValues,
  CampaignMemberUpdateValues,
} from "@/modules/crm/campaign/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CampaignMemberRowWithParty = {
  member: typeof campaignMember.$inferSelect;
  partyDisplayName: string | null;
};

export class CampaignMemberRepository {
  async insert(
    values: CampaignMemberInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(campaignMember)
      .values({
        businessId: values.businessId,
        campaignId: values.campaignId,
        partyId: values.partyId,
        memberStatus: values.memberStatus,
        leadId: values.leadId ?? null,
        opportunityId: values.opportunityId ?? null,
        consentCheckedAt: values.consentCheckedAt ?? null,
        consentGranted: values.consentGranted ?? false,
        outreachChannel: values.outreachChannel ?? null,
        respondedAt: values.respondedAt ?? null,
        convertedAt: values.convertedAt ?? null,
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
    memberId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(campaignMember)
      .where(
        and(
          eq(campaignMember.businessId, businessId),
          eq(campaignMember.id, memberId),
          isNull(campaignMember.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCampaignAndParty(
    businessId: string,
    campaignId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(campaignMember)
      .where(
        and(
          eq(campaignMember.businessId, businessId),
          eq(campaignMember.campaignId, campaignId),
          eq(campaignMember.partyId, partyId),
          isNull(campaignMember.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async update(
    businessId: string,
    memberId: string,
    values: CampaignMemberUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(campaignMember)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(campaignMember.businessId, businessId),
          eq(campaignMember.id, memberId),
          isNull(campaignMember.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async listByCampaignId(
    businessId: string,
    campaignId: string,
    dbClient: DbClient = getDb()
  ): Promise<CampaignMemberRowWithParty[]> {
    const rows = await dbClient
      .select({
        member: campaignMember,
        partyDisplayName: party.displayName,
      })
      .from(campaignMember)
      .leftJoin(party, eq(party.id, campaignMember.partyId))
      .where(
        and(
          eq(campaignMember.businessId, businessId),
          eq(campaignMember.campaignId, campaignId),
          isNull(campaignMember.deletedAt)
        )
      )
      .orderBy(asc(campaignMember.createdAt));

    return rows;
  }

  async listByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(campaignMember)
      .where(
        and(
          eq(campaignMember.businessId, businessId),
          eq(campaignMember.partyId, partyId),
          isNull(campaignMember.deletedAt)
        )
      )
      .orderBy(desc(campaignMember.updatedAt));
  }

  async countByCampaign(
    businessId: string,
    campaignId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignMember)
      .where(
        and(
          eq(campaignMember.businessId, businessId),
          eq(campaignMember.campaignId, campaignId),
          isNull(campaignMember.deletedAt)
        )
      );

    return row?.count ?? 0;
  }
}

export function createCampaignMemberRepository() {
  return new CampaignMemberRepository();
}
