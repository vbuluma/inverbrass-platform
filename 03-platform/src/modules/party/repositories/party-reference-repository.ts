/**
 * Purpose:
 * Read Party Foundation reference catalogues (persistence only).
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { industry } from "@/db/schema/industry";
import { language } from "@/db/schema/language";
import { organizationType } from "@/db/schema/organization-type";
import { partyStatus } from "@/db/schema/party-status";
import { partyType } from "@/db/schema/party-type";

type DbClient = PostgresJsDatabase<typeof schema>;

export class PartyReferenceRepository {
  async listActivePartyTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: partyType.code,
        name: partyType.name,
      })
      .from(partyType)
      .where(eq(partyType.isActive, true))
      .orderBy(asc(partyType.displayOrder), asc(partyType.name));
  }

  async listActivePartyStatuses(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: partyStatus.code,
        name: partyStatus.name,
      })
      .from(partyStatus)
      .where(eq(partyStatus.isActive, true))
      .orderBy(asc(partyStatus.displayOrder), asc(partyStatus.name));
  }

  async listActiveOrganizationTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: organizationType.code,
        name: organizationType.name,
      })
      .from(organizationType)
      .where(eq(organizationType.isActive, true))
      .orderBy(asc(organizationType.displayOrder), asc(organizationType.name));
  }

  async listActiveIndustries(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: industry.code,
        name: industry.name,
      })
      .from(industry)
      .where(eq(industry.isActive, true))
      .orderBy(asc(industry.displayOrder), asc(industry.name));
  }

  async listActiveLanguages(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: language.code,
        name: language.name,
      })
      .from(language)
      .where(eq(language.isActive, true))
      .orderBy(asc(language.displayOrder), asc(language.name));
  }

  async findPartyTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: partyType.code, name: partyType.name })
      .from(partyType)
      .where(and(eq(partyType.code, code), eq(partyType.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  async findPartyStatusByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: partyStatus.code, name: partyStatus.name })
      .from(partyStatus)
      .where(and(eq(partyStatus.code, code), eq(partyStatus.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  async findOrganizationTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        code: organizationType.code,
        name: organizationType.name,
      })
      .from(organizationType)
      .where(
        and(
          eq(organizationType.code, code),
          eq(organizationType.isActive, true)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findIndustryByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: industry.code, name: industry.name })
      .from(industry)
      .where(and(eq(industry.code, code), eq(industry.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  async findLanguageByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: language.code, name: language.name })
      .from(language)
      .where(and(eq(language.code, code), eq(language.isActive, true)))
      .limit(1);

    return row ?? null;
  }
}

export function createPartyReferenceRepository(): PartyReferenceRepository {
  return new PartyReferenceRepository();
}
