/**
 * Purpose:
 * Persist and read Organization Profile rows.
 *
 * Architecture:
 * OrganizationProfileService → OrganizationProfileRepository → Drizzle
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { organizationProfile } from "@/db/schema/organization-profile";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OrganizationProfileInsertValues = {
  partyId: string;
  organizationName: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  industryCode: string;
  organizationTypeCode: string;
  website?: string | null;
};

export type OrganizationProfileUpdateValues = {
  organizationName?: string;
  registrationNumber?: string | null;
  taxNumber?: string | null;
  industryCode?: string;
  organizationTypeCode?: string;
  website?: string | null;
};

export class OrganizationProfileRepository {
  async insert(
    values: OrganizationProfileInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(organizationProfile)
      .values({
        partyId: values.partyId,
        organizationName: values.organizationName,
        registrationNumber: values.registrationNumber ?? null,
        taxNumber: values.taxNumber ?? null,
        industryCode: values.industryCode,
        organizationTypeCode: values.organizationTypeCode,
        website: values.website ?? null,
      })
      .returning();

    return row;
  }

  async findByPartyId(partyId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(organizationProfile)
      .where(eq(organizationProfile.partyId, partyId))
      .limit(1);

    return row ?? null;
  }

  async updateByPartyId(
    partyId: string,
    values: OrganizationProfileUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(organizationProfile)
      .set({
        ...(values.organizationName !== undefined
          ? { organizationName: values.organizationName }
          : {}),
        ...(values.registrationNumber !== undefined
          ? { registrationNumber: values.registrationNumber }
          : {}),
        ...(values.taxNumber !== undefined
          ? { taxNumber: values.taxNumber }
          : {}),
        ...(values.industryCode !== undefined
          ? { industryCode: values.industryCode }
          : {}),
        ...(values.organizationTypeCode !== undefined
          ? { organizationTypeCode: values.organizationTypeCode }
          : {}),
        ...(values.website !== undefined ? { website: values.website } : {}),
        updatedAt: new Date(),
      })
      .where(eq(organizationProfile.partyId, partyId))
      .returning();

    return row ?? null;
  }
}

export function createOrganizationProfileRepository(): OrganizationProfileRepository {
  return new OrganizationProfileRepository();
}
