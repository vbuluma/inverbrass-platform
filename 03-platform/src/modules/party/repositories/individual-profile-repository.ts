/**
 * Purpose:
 * Persist and read Individual Profile rows.
 *
 * Architecture:
 * IndividualProfileService → IndividualProfileRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { individualProfile } from "@/db/schema/individual-profile";

type DbClient = PostgresJsDatabase<typeof schema>;

export type IndividualProfileInsertValues = {
  partyId: string;
  fullName: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferredLanguageCode?: string | null;
};

export type IndividualProfileUpdateValues = {
  fullName?: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  preferredLanguageCode?: string | null;
};

export class IndividualProfileRepository {
  async insert(
    values: IndividualProfileInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(individualProfile)
      .values({
        partyId: values.partyId,
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth ?? null,
        gender: values.gender ?? null,
        preferredLanguageCode: values.preferredLanguageCode ?? null,
      })
      .returning();

    return row;
  }

  async findByPartyId(partyId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(individualProfile)
      .where(eq(individualProfile.partyId, partyId))
      .limit(1);

    return row ?? null;
  }

  async updateByPartyId(
    partyId: string,
    values: IndividualProfileUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(individualProfile)
      .set({
        ...(values.fullName !== undefined ? { fullName: values.fullName } : {}),
        ...(values.dateOfBirth !== undefined
          ? { dateOfBirth: values.dateOfBirth }
          : {}),
        ...(values.gender !== undefined ? { gender: values.gender } : {}),
        ...(values.preferredLanguageCode !== undefined
          ? { preferredLanguageCode: values.preferredLanguageCode }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(individualProfile.partyId, partyId))
      .returning();

    return row ?? null;
  }
}

export function createIndividualProfileRepository(): IndividualProfileRepository {
  return new IndividualProfileRepository();
}
