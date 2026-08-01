/**
 * Purpose:
 * Persist and read Offering Relationship Type catalogue rows.
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import { and, asc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringRelationshipType } from "@/db/schema/offering-relationship-type";

type DbClient = PostgresJsDatabase<typeof schema>;

export class OfferingRelationshipTypeRepository {
  async listActiveByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(offeringRelationshipType)
      .where(
        and(
          eq(offeringRelationshipType.businessId, businessId),
          eq(offeringRelationshipType.isActive, true),
          isNull(offeringRelationshipType.deletedAt)
        )
      )
      .orderBy(
        asc(offeringRelationshipType.sortOrder),
        asc(offeringRelationshipType.name)
      );
  }

  async findByCode(
    businessId: string,
    code: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringRelationshipType)
      .where(
        and(
          eq(offeringRelationshipType.businessId, businessId),
          eq(offeringRelationshipType.code, code),
          eq(offeringRelationshipType.isActive, true),
          isNull(offeringRelationshipType.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findById(
    businessId: string,
    relationshipTypeId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(offeringRelationshipType)
      .where(
        and(
          eq(offeringRelationshipType.businessId, businessId),
          eq(offeringRelationshipType.id, relationshipTypeId),
          isNull(offeringRelationshipType.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }
}

export function createOfferingRelationshipTypeRepository(): OfferingRelationshipTypeRepository {
  return new OfferingRelationshipTypeRepository();
}
