/**
 * Purpose:
 * Idempotent bootstrap of offering relationship types per business.
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringRelationshipType } from "@/db/schema/offering-relationship-type";
import { offeringRelationshipTypes } from "@/db/seeds/offering-relationship-types";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingRelationshipTypesSeedResult = {
  seeded: boolean;
  inserted: number;
  skipped: number;
};

export async function seedDefaultOfferingRelationshipTypesForBusiness(
  businessId: string,
  db: DbClient = getDb()
): Promise<OfferingRelationshipTypesSeedResult> {
  const [existing] = await db
    .select({ id: offeringRelationshipType.id })
    .from(offeringRelationshipType)
    .where(
      and(
        eq(offeringRelationshipType.businessId, businessId),
        isNull(offeringRelationshipType.deletedAt)
      )
    )
    .limit(1);

  if (existing) {
    return { seeded: false, inserted: 0, skipped: offeringRelationshipTypes.length };
  }

  let inserted = 0;

  for (const template of offeringRelationshipTypes) {
    await db.insert(offeringRelationshipType).values({
      businessId,
      code: template.code,
      name: template.name,
      description: template.description,
      isBidirectional: template.isBidirectional,
      isActive: true,
      sortOrder: template.sortOrder,
    });
    inserted += 1;
  }

  return { seeded: true, inserted, skipped: 0 };
}
