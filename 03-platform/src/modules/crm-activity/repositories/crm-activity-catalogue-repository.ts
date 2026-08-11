/**
 * Metadata catalogue repository — activity types, statuses, priorities.
 * BP-004 / IP-05
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmActivityPriority } from "@/db/schema/crm-activity-priority";
import { crmActivityStatus } from "@/db/schema/crm-activity-status";
import { crmActivityType } from "@/db/schema/crm-activity-type";
import { seedCrmActivityCatalogues } from "@/db/seeds/crm-activity-catalogues-seed";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmActivityCatalogueRow = {
  code: string;
  name: string;
  description: string | null;
};

export type CrmActivityTypeCatalogueRow = CrmActivityCatalogueRow & {
  requiresCompletionNotes: boolean;
};

export type CrmActivityStatusCatalogueRow = CrmActivityCatalogueRow & {
  isTerminal: boolean;
  isEditable: boolean;
};

export class CrmActivityCatalogueRepository {
  async ensureDefaults(dbClient: DbClient = getDb()) {
    await seedCrmActivityCatalogues(dbClient);
  }

  async listActiveTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmActivityType.code,
        name: crmActivityType.name,
        description: crmActivityType.description,
        requiresCompletionNotes: crmActivityType.requiresCompletionNotes,
      })
      .from(crmActivityType)
      .where(eq(crmActivityType.isActive, true))
      .orderBy(asc(crmActivityType.displayOrder));
  }

  async listActiveStatuses(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmActivityStatus.code,
        name: crmActivityStatus.name,
        description: crmActivityStatus.description,
        isTerminal: crmActivityStatus.isTerminal,
        isEditable: crmActivityStatus.isEditable,
      })
      .from(crmActivityStatus)
      .where(eq(crmActivityStatus.isActive, true))
      .orderBy(asc(crmActivityStatus.displayOrder));
  }

  async listActivePriorities(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmActivityPriority.code,
        name: crmActivityPriority.name,
        description: crmActivityPriority.description,
      })
      .from(crmActivityPriority)
      .where(eq(crmActivityPriority.isActive, true))
      .orderBy(asc(crmActivityPriority.displayOrder));
  }

  async findTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        code: crmActivityType.code,
        name: crmActivityType.name,
        requiresCompletionNotes: crmActivityType.requiresCompletionNotes,
      })
      .from(crmActivityType)
      .where(eq(crmActivityType.code, code))
      .limit(1);

    return row ?? null;
  }

  async findStatusByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({
        code: crmActivityStatus.code,
        isTerminal: crmActivityStatus.isTerminal,
        isEditable: crmActivityStatus.isEditable,
      })
      .from(crmActivityStatus)
      .where(eq(crmActivityStatus.code, code))
      .limit(1);

    return row ?? null;
  }
}

export function createCrmActivityCatalogueRepository() {
  return new CrmActivityCatalogueRepository();
}
