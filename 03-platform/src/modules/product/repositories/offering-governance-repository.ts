/**
 * Purpose:
 * Persist and read offering governance master records.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringGovernance } from "@/db/schema/offering-governance";
import { party } from "@/db/schema/party";
import { product } from "@/db/schema/product";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingGovernanceInsertValues = {
  businessId: string;
  offeringId: string;
  responsibleBusinessOwnerPartyId?: string | null;
  technicalOwnerPartyId?: string | null;
  productStewardPartyId?: string | null;
  governanceStatus: string;
  readinessScore?: string;
  lastValidationDate?: Date | null;
  isLocked?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type OfferingGovernanceUpdateValues = {
  responsibleBusinessOwnerPartyId?: string | null;
  technicalOwnerPartyId?: string | null;
  productStewardPartyId?: string | null;
  governanceStatus?: string;
  readinessScore?: string;
  lastValidationDate?: Date | null;
  isLocked?: boolean;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
};

export type OfferingGovernanceSearchFilters = {
  query?: string;
  governanceStatus?: string;
  ownerPartyId?: string;
  readinessMin?: number;
  readinessMax?: number;
};

export type OfferingGovernanceRowWithRelations = {
  governance: typeof offeringGovernance.$inferSelect;
  offeringCode: string;
  offeringName: string;
  businessOwnerName: string | null;
  technicalOwnerName: string | null;
  stewardName: string | null;
};

export class OfferingGovernanceRepository {
  async insert(values: OfferingGovernanceInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(offeringGovernance)
      .values({
        businessId: values.businessId,
        offeringId: values.offeringId,
        responsibleBusinessOwnerPartyId:
          values.responsibleBusinessOwnerPartyId ?? null,
        technicalOwnerPartyId: values.technicalOwnerPartyId ?? null,
        productStewardPartyId: values.productStewardPartyId ?? null,
        governanceStatus: values.governanceStatus,
        readinessScore: values.readinessScore ?? "0",
        lastValidationDate: values.lastValidationDate ?? null,
        isLocked: values.isLocked ?? false,
        notes: values.notes ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(businessId: string, id: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(offeringGovernance)
      .where(
        and(
          eq(offeringGovernance.businessId, businessId),
          eq(offeringGovernance.id, id),
          isNull(offeringGovernance.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByOfferingId(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringGovernance)
      .where(
        and(
          eq(offeringGovernance.businessId, businessId),
          eq(offeringGovernance.offeringId, offeringId),
          isNull(offeringGovernance.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    id: string,
    values: OfferingGovernanceUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(offeringGovernance)
      .set({
        ...(values.responsibleBusinessOwnerPartyId !== undefined
          ? {
              responsibleBusinessOwnerPartyId:
                values.responsibleBusinessOwnerPartyId,
            }
          : {}),
        ...(values.technicalOwnerPartyId !== undefined
          ? { technicalOwnerPartyId: values.technicalOwnerPartyId }
          : {}),
        ...(values.productStewardPartyId !== undefined
          ? { productStewardPartyId: values.productStewardPartyId }
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
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        ...(values.updatedBy !== undefined ? { updatedBy: values.updatedBy } : {}),
        updatedAt: new Date(),
        version: sql`${offeringGovernance.version} + 1`,
      })
      .where(
        and(
          eq(offeringGovernance.businessId, businessId),
          eq(offeringGovernance.id, id),
          isNull(offeringGovernance.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async search(
    businessId: string,
    filters: OfferingGovernanceSearchFilters = {},
    dbClient: DbClient = getDb()
  ): Promise<OfferingGovernanceRowWithRelations[]> {
    const businessOwner = dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .as("business_owner");

    const technicalOwner = dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .as("technical_owner");

    const steward = dbClient
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .as("steward");

    const conditions = [
      eq(offeringGovernance.businessId, businessId),
      isNull(offeringGovernance.deletedAt),
    ];

    if (filters.governanceStatus) {
      conditions.push(
        eq(offeringGovernance.governanceStatus, filters.governanceStatus)
      );
    }

    if (filters.ownerPartyId) {
      conditions.push(
        eq(
          offeringGovernance.responsibleBusinessOwnerPartyId,
          filters.ownerPartyId
        )
      );
    }

    if (filters.readinessMin !== undefined) {
      conditions.push(
        sql`${offeringGovernance.readinessScore} >= ${filters.readinessMin}`
      );
    }

    if (filters.readinessMax !== undefined) {
      conditions.push(
        sql`${offeringGovernance.readinessScore} <= ${filters.readinessMax}`
      );
    }

    if (filters.query?.trim()) {
      const pattern = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(product.productCode, pattern),
          ilike(product.productName, pattern),
          ilike(offeringGovernance.governanceStatus, pattern)
        )!
      );
    }

    const rows = await dbClient
      .select({
        governance: offeringGovernance,
        offeringCode: product.productCode,
        offeringName: product.productName,
        businessOwnerName: businessOwner.displayName,
        technicalOwnerName: technicalOwner.displayName,
        stewardName: steward.displayName,
      })
      .from(offeringGovernance)
      .innerJoin(product, eq(offeringGovernance.offeringId, product.id))
      .leftJoin(
        businessOwner,
        eq(
          offeringGovernance.responsibleBusinessOwnerPartyId,
          businessOwner.id
        )
      )
      .leftJoin(
        technicalOwner,
        eq(offeringGovernance.technicalOwnerPartyId, technicalOwner.id)
      )
      .leftJoin(
        steward,
        eq(offeringGovernance.productStewardPartyId, steward.id)
      )
      .where(and(...conditions))
      .orderBy(desc(offeringGovernance.updatedAt));

    return rows;
  }

  async countByStatus(businessId: string, dbClient: DbClient = getDb()) {
    const rows = await dbClient
      .select({
        status: offeringGovernance.governanceStatus,
        count: sql<number>`count(*)::int`,
      })
      .from(offeringGovernance)
      .where(
        and(
          eq(offeringGovernance.businessId, businessId),
          isNull(offeringGovernance.deletedAt)
        )
      )
      .groupBy(offeringGovernance.governanceStatus);

    return rows;
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ count: sql<number>`count(*)::int` })
      .from(offeringGovernance)
      .where(
        and(
          eq(offeringGovernance.businessId, businessId),
          isNull(offeringGovernance.deletedAt)
        )
      );

    return Number(row?.count ?? 0);
  }
}

export function createOfferingGovernanceRepository(): OfferingGovernanceRepository {
  return new OfferingGovernanceRepository();
}
