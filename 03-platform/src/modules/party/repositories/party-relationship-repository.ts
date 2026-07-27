/**
 * Purpose:
 * Persist and read Party Relationship rows (persistence only).
 *
 * Architecture:
 * PartyRelationshipService → PartyRelationshipRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-005 – Party Relationships
 */

import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { partyRelationship } from "@/db/schema/party-relationship";
import {
  PARTY_RELATIONSHIP_STATUS_CODES,
  type PartyRelationshipStatusCode,
} from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyRelationshipInsertValues = {
  businessId: string;
  fromPartyId: string;
  toPartyId: string;
  relationshipTypeCode: string;
  startDate: string;
  endDate?: string | null;
  statusCode: PartyRelationshipStatusCode;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyRelationshipUpdateValues = {
  startDate?: string;
  endDate?: string | null;
  statusCode?: PartyRelationshipStatusCode;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class PartyRelationshipRepository {
  async insert(
    values: PartyRelationshipInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(partyRelationship)
      .values({
        businessId: values.businessId,
        fromPartyId: values.fromPartyId,
        toPartyId: values.toPartyId,
        relationshipTypeCode: values.relationshipTypeCode,
        startDate: values.startDate,
        endDate: values.endDate ?? null,
        statusCode: values.statusCode,
        notes: values.notes ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    partyRelationshipId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyRelationship)
      .where(
        and(
          eq(partyRelationship.businessId, businessId),
          eq(partyRelationship.id, partyRelationshipId),
          isNull(partyRelationship.deletedAt)
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
      .from(partyRelationship)
      .where(
        and(
          eq(partyRelationship.businessId, businessId),
          isNull(partyRelationship.deletedAt),
          or(
            eq(partyRelationship.fromPartyId, partyId),
            eq(partyRelationship.toPartyId, partyId)
          )
        )
      )
      .orderBy(
        desc(partyRelationship.statusCode),
        desc(partyRelationship.startDate),
        asc(partyRelationship.createdAt)
      );
  }

  async findActiveByPartiesAndType(
    businessId: string,
    fromPartyId: string,
    toPartyId: string,
    relationshipTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyRelationship)
      .where(
        and(
          eq(partyRelationship.businessId, businessId),
          eq(partyRelationship.fromPartyId, fromPartyId),
          eq(partyRelationship.toPartyId, toPartyId),
          eq(partyRelationship.relationshipTypeCode, relationshipTypeCode),
          eq(
            partyRelationship.statusCode,
            PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE
          ),
          isNull(partyRelationship.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findActiveBetweenPartiesAndType(
    businessId: string,
    partyIdA: string,
    partyIdB: string,
    relationshipTypeCode: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(partyRelationship)
      .where(
        and(
          eq(partyRelationship.businessId, businessId),
          eq(partyRelationship.relationshipTypeCode, relationshipTypeCode),
          eq(
            partyRelationship.statusCode,
            PARTY_RELATIONSHIP_STATUS_CODES.ACTIVE
          ),
          isNull(partyRelationship.deletedAt),
          or(
            and(
              eq(partyRelationship.fromPartyId, partyIdA),
              eq(partyRelationship.toPartyId, partyIdB)
            ),
            and(
              eq(partyRelationship.fromPartyId, partyIdB),
              eq(partyRelationship.toPartyId, partyIdA)
            )
          )
        )
      )
      .limit(1);

    return row ?? null;
  }

  async updateById(
    businessId: string,
    partyRelationshipId: string,
    values: PartyRelationshipUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(partyRelationship)
      .set({
        ...(values.startDate !== undefined
          ? { startDate: values.startDate }
          : {}),
        ...(values.endDate !== undefined ? { endDate: values.endDate } : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
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
          eq(partyRelationship.businessId, businessId),
          eq(partyRelationship.id, partyRelationshipId),
          isNull(partyRelationship.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createPartyRelationshipRepository(): PartyRelationshipRepository {
  return new PartyRelationshipRepository();
}
