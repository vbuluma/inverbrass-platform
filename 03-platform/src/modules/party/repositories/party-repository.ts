/**
 * Purpose:
 * Persist and read master Party rows.
 *
 * Architecture:
 * PartyService → PartyRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { party } from "@/db/schema/party";
import type { PartyStatusCode, PartyTypeCode } from "@/modules/party/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type PartyInsertValues = {
  businessId: string;
  partyNumber: string;
  partyTypeCode: PartyTypeCode;
  displayName: string;
  statusCode: PartyStatusCode;
  notes?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type PartyUpdateValues = {
  displayName?: string;
  statusCode?: PartyStatusCode;
  notes?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
  version?: number;
};

export class PartyRepository {
  async insert(values: PartyInsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(party)
      .values({
        businessId: values.businessId,
        partyNumber: values.partyNumber,
        partyTypeCode: values.partyTypeCode,
        displayName: values.displayName,
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
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
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

  async findByIdIncludingArchived(
    businessId: string,
    partyId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(party)
      .where(and(eq(party.businessId, businessId), eq(party.id, partyId)))
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(party)
      .where(and(eq(party.businessId, businessId), isNull(party.deletedAt)))
      .orderBy(desc(party.registrationDate), asc(party.displayName));
  }

  async listRecentByBusinessId(
    businessId: string,
    limit = 8,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(party)
      .where(and(eq(party.businessId, businessId), isNull(party.deletedAt)))
      .orderBy(desc(party.registrationDate))
      .limit(limit);
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(party)
      .where(and(eq(party.businessId, businessId), isNull(party.deletedAt)));

    return Number(row?.value ?? 0);
  }

  async countByType(
    businessId: string,
    partyTypeCode: PartyTypeCode,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(party)
      .where(
        and(
          eq(party.businessId, businessId),
          eq(party.partyTypeCode, partyTypeCode),
          isNull(party.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async countByStatus(
    businessId: string,
    statusCode: PartyStatusCode,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: count() })
      .from(party)
      .where(
        and(
          eq(party.businessId, businessId),
          eq(party.statusCode, statusCode),
          isNull(party.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async updateById(
    businessId: string,
    partyId: string,
    values: PartyUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(party)
      .set({
        ...(values.displayName !== undefined
          ? { displayName: values.displayName }
          : {}),
        ...(values.statusCode !== undefined
          ? { statusCode: values.statusCode }
          : {}),
        ...(values.notes !== undefined ? { notes: values.notes } : {}),
        ...(values.updatedBy !== undefined
          ? { updatedBy: values.updatedBy }
          : {}),
        ...(values.deletedAt !== undefined
          ? { deletedAt: values.deletedAt }
          : {}),
        version: values.version ?? sql`${party.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(party.businessId, businessId), eq(party.id, partyId)))
      .returning();

    return row ?? null;
  }

  async existsPartyNumber(
    businessId: string,
    partyNumber: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ id: party.id })
      .from(party)
      .where(
        and(
          eq(party.businessId, businessId),
          eq(party.partyNumber, partyNumber)
        )
      )
      .limit(1);

    return Boolean(row);
  }
}

export function createPartyRepository(): PartyRepository {
  return new PartyRepository();
}
