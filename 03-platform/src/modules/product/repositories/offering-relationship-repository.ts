/**
 * Purpose:
 * Persist and read Offering Relationship rows (persistence only).
 *
 * Architecture:
 * OfferingRelationshipService → OfferingRelationshipRepository → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringRelationship } from "@/db/schema/offering-relationship";
import { offeringRelationshipType } from "@/db/schema/offering-relationship-type";
import {
  OFFERING_RELATIONSHIP_STATUS_CODES,
  type OfferingRelationshipStatusCode,
} from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingRelationshipInsertValues = {
  businessId: string;
  sourceOfferingId: string;
  targetOfferingId: string;
  relationshipTypeId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  status: OfferingRelationshipStatusCode;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type OfferingRelationshipUpdateValues = {
  effectiveFrom?: string;
  effectiveTo?: string | null;
  status?: OfferingRelationshipStatusCode;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class OfferingRelationshipRepository {
  async insert(
    values: OfferingRelationshipInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(offeringRelationship)
      .values({
        businessId: values.businessId,
        sourceOfferingId: values.sourceOfferingId,
        targetOfferingId: values.targetOfferingId,
        relationshipTypeId: values.relationshipTypeId,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo ?? null,
        status: values.status,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    offeringRelationshipId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringRelationship)
      .where(
        and(
          eq(offeringRelationship.businessId, businessId),
          eq(offeringRelationship.id, offeringRelationshipId),
          isNull(offeringRelationship.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByOfferingId(
    businessId: string,
    offeringId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(offeringRelationship)
      .where(
        and(
          eq(offeringRelationship.businessId, businessId),
          isNull(offeringRelationship.deletedAt),
          or(
            eq(offeringRelationship.sourceOfferingId, offeringId),
            eq(offeringRelationship.targetOfferingId, offeringId)
          )
        )
      )
      .orderBy(
        desc(offeringRelationship.status),
        desc(offeringRelationship.effectiveFrom),
        asc(offeringRelationship.createdAt)
      );
  }

  async findActiveByOfferingsAndType(
    businessId: string,
    sourceOfferingId: string,
    targetOfferingId: string,
    relationshipTypeId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringRelationship)
      .where(
        and(
          eq(offeringRelationship.businessId, businessId),
          eq(offeringRelationship.sourceOfferingId, sourceOfferingId),
          eq(offeringRelationship.targetOfferingId, targetOfferingId),
          eq(offeringRelationship.relationshipTypeId, relationshipTypeId),
          eq(
            offeringRelationship.status,
            OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE
          ),
          isNull(offeringRelationship.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listActiveDependsOnEdges(
    businessId: string,
    dependsOnTypeId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select({
        sourceOfferingId: offeringRelationship.sourceOfferingId,
        targetOfferingId: offeringRelationship.targetOfferingId,
      })
      .from(offeringRelationship)
      .where(
        and(
          eq(offeringRelationship.businessId, businessId),
          eq(offeringRelationship.relationshipTypeId, dependsOnTypeId),
          eq(
            offeringRelationship.status,
            OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE
          ),
          isNull(offeringRelationship.deletedAt)
        )
      );
  }

  async updateById(
    businessId: string,
    offeringRelationshipId: string,
    values: OfferingRelationshipUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(offeringRelationship)
      .set({
        ...(values.effectiveFrom !== undefined
          ? { effectiveFrom: values.effectiveFrom }
          : {}),
        ...(values.effectiveTo !== undefined
          ? { effectiveTo: values.effectiveTo }
          : {}),
        ...(values.status !== undefined ? { status: values.status } : {}),
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
          eq(offeringRelationship.businessId, businessId),
          eq(offeringRelationship.id, offeringRelationshipId),
          isNull(offeringRelationship.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async findTypeCodeById(
    businessId: string,
    relationshipTypeId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ code: offeringRelationshipType.code })
      .from(offeringRelationshipType)
      .where(
        and(
          eq(offeringRelationshipType.businessId, businessId),
          eq(offeringRelationshipType.id, relationshipTypeId),
          isNull(offeringRelationshipType.deletedAt)
        )
      )
      .limit(1);

    return row?.code ?? null;
  }
}

export function createOfferingRelationshipRepository(): OfferingRelationshipRepository {
  return new OfferingRelationshipRepository();
}
