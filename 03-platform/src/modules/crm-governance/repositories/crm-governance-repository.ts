/**
 * Persist and read CRM governance master records (party-keyed).
 */

import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmGovernance } from "@/db/schema/crm-governance";
import { party } from "@/db/schema/party";
import { platformUser } from "@/db/schema/platform-user";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmGovernanceInsertValues = {
  businessId: string;
  partyId: string;
  ownerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  stewardUserId?: string | null;
  governanceStatus: string;
  readinessScore?: string;
  lastValidationDate?: Date | null;
  isLocked?: boolean;
  activationBlocked?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CrmGovernanceUpdateValues = {
  ownerUserId?: string | null;
  relationshipManagerUserId?: string | null;
  stewardUserId?: string | null;
  governanceStatus?: string;
  readinessScore?: string;
  lastValidationDate?: Date | null;
  isLocked?: boolean;
  activationBlocked?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export class CrmGovernanceRepository {
  async insert(values: CrmGovernanceInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmGovernance)
      .values({
        businessId: values.businessId,
        partyId: values.partyId,
        ownerUserId: values.ownerUserId ?? null,
        relationshipManagerUserId: values.relationshipManagerUserId ?? null,
        stewardUserId: values.stewardUserId ?? null,
        governanceStatus: values.governanceStatus,
        readinessScore: values.readinessScore ?? "0",
        lastValidationDate: values.lastValidationDate ?? null,
        isLocked: values.isLocked ?? false,
        activationBlocked: values.activationBlocked ?? false,
        notes: values.notes ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();
    return row;
  }

  async findByPartyId(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(crmGovernance)
      .where(
        and(
          eq(crmGovernance.businessId, businessId),
          eq(crmGovernance.partyId, partyId),
          isNull(crmGovernance.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async findById(businessId: string, id: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmGovernance)
      .where(
        and(
          eq(crmGovernance.businessId, businessId),
          eq(crmGovernance.id, id),
          isNull(crmGovernance.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async updateById(
    businessId: string,
    id: string,
    values: CrmGovernanceUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmGovernance)
      .set({
        ...(values.ownerUserId !== undefined
          ? { ownerUserId: values.ownerUserId }
          : {}),
        ...(values.relationshipManagerUserId !== undefined
          ? { relationshipManagerUserId: values.relationshipManagerUserId }
          : {}),
        ...(values.stewardUserId !== undefined
          ? { stewardUserId: values.stewardUserId }
          : {}),
        ...(values.governanceStatus !== undefined
          ? { governanceStatus: values.governanceStatus }
          : {}),
        ...(values.readinessScore !== undefined
          ? { readinessScore: values.readinessScore }
          : {}),
        ...(values.lastValidationDate !== undefined
          ? { lastValidationDate: values.lastValidationDate }
          : {}),
        ...(values.isLocked !== undefined ? { isLocked: values.isLocked } : {}),
        ...(values.activationBlocked !== undefined
          ? { activationBlocked: values.activationBlocked }
          : {}),
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        ...(values.updatedBy !== undefined ? { updatedBy: values.updatedBy } : {}),
        updatedAt: new Date(),
        version: sql`${crmGovernance.version} + 1`,
      })
      .where(
        and(
          eq(crmGovernance.businessId, businessId),
          eq(crmGovernance.id, id),
          isNull(crmGovernance.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async search(businessId: string, dbClient: DbClient = getDb()) {
    const owner = dbClient
      .select({
        id: platformUser.id,
        displayName: platformUser.displayName,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
      })
      .from(platformUser)
      .as("gov_owner");

    return dbClient
      .select({
        governance: crmGovernance,
        partyDisplayName: party.displayName,
        ownerDisplayName: owner.displayName,
        ownerFirstName: owner.firstName,
        ownerLastName: owner.lastName,
      })
      .from(crmGovernance)
      .innerJoin(party, eq(crmGovernance.partyId, party.id))
      .leftJoin(owner, eq(crmGovernance.ownerUserId, owner.id))
      .where(
        and(
          eq(crmGovernance.businessId, businessId),
          isNull(crmGovernance.deletedAt)
        )
      )
      .orderBy(desc(crmGovernance.updatedAt));
  }

  async countByStatus(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        status: crmGovernance.governanceStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(crmGovernance)
      .where(
        and(
          eq(crmGovernance.businessId, businessId),
          isNull(crmGovernance.deletedAt)
        )
      )
      .groupBy(crmGovernance.governanceStatus);
  }
}

export function createCrmGovernanceRepository() {
  return new CrmGovernanceRepository();
}
