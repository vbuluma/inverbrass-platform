/**
 * Metadata catalogue repository — appointment types and statuses.
 * BP-004 / IP-06
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmAppointmentStatus } from "@/db/schema/crm-appointment-status";
import { crmAppointmentType } from "@/db/schema/crm-appointment-type";
import { seedCrmAppointmentCatalogues } from "@/db/seeds/crm-appointment-catalogues-seed";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmAppointmentCatalogueRepository {
  async ensureDefaults(dbClient: DbClient = getDb()) {
    await seedCrmAppointmentCatalogues(dbClient);
  }

  async listActiveTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmAppointmentType.code,
        name: crmAppointmentType.name,
        description: crmAppointmentType.description,
        defaultDurationMinutes: crmAppointmentType.defaultDurationMinutes,
      })
      .from(crmAppointmentType)
      .where(eq(crmAppointmentType.isActive, true))
      .orderBy(asc(crmAppointmentType.displayOrder));
  }

  async listActiveStatuses(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmAppointmentStatus.code,
        name: crmAppointmentStatus.name,
        isTerminal: crmAppointmentStatus.isTerminal,
        isEditable: crmAppointmentStatus.isEditable,
      })
      .from(crmAppointmentStatus)
      .where(eq(crmAppointmentStatus.isActive, true))
      .orderBy(asc(crmAppointmentStatus.displayOrder));
  }

  async findTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        code: crmAppointmentType.code,
        name: crmAppointmentType.name,
        defaultDurationMinutes: crmAppointmentType.defaultDurationMinutes,
      })
      .from(crmAppointmentType)
      .where(eq(crmAppointmentType.code, code))
      .limit(1);

    return row ?? null;
  }

  async findStatusByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        code: crmAppointmentStatus.code,
        isTerminal: crmAppointmentStatus.isTerminal,
        isEditable: crmAppointmentStatus.isEditable,
      })
      .from(crmAppointmentStatus)
      .where(eq(crmAppointmentStatus.code, code))
      .limit(1);

    return row ?? null;
  }
}

export function createCrmAppointmentCatalogueRepository() {
  return new CrmAppointmentCatalogueRepository();
}
