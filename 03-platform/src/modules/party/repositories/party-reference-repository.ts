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
import { contactType } from "@/db/schema/contact-type";
import { business } from "@/db/schema/business";
import { country } from "@/db/schema/country";
import { industry } from "@/db/schema/industry";
import { language } from "@/db/schema/language";
import { organizationType } from "@/db/schema/organization-type";
import { partyStatus } from "@/db/schema/party-status";
import { partyType } from "@/db/schema/party-type";
import { roleType } from "@/db/schema/role-type";

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

  async listActiveRoleTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: roleType.code,
        name: roleType.name,
      })
      .from(roleType)
      .where(eq(roleType.isActive, true))
      .orderBy(asc(roleType.displayOrder), asc(roleType.name));
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

  async findRoleTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: roleType.code, name: roleType.name })
      .from(roleType)
      .where(and(eq(roleType.code, code), eq(roleType.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  async listActiveContactTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: contactType.code,
        name: contactType.name,
      })
      .from(contactType)
      .where(eq(contactType.isActive, true))
      .orderBy(asc(contactType.displayOrder), asc(contactType.name));
  }

  async findContactTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ code: contactType.code, name: contactType.name })
      .from(contactType)
      .where(and(eq(contactType.code, code), eq(contactType.isActive, true)))
      .limit(1);

    return row ?? null;
  }

  /**
   * WHAT: Load Business operating country + Localization dialing code.
   * WHY: EDS-003 — Party phone normalization uses tenant country dialing code.
   */
  async findBusinessPhoneContext(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({
        countryCode: business.countryCode,
        dialCode: country.phoneCode,
      })
      .from(business)
      .innerJoin(country, eq(country.code, business.countryCode))
      .where(eq(business.id, businessId))
      .limit(1);

    return row ?? null;
  }
}

export function createPartyReferenceRepository(): PartyReferenceRepository {
  return new PartyReferenceRepository();
}
