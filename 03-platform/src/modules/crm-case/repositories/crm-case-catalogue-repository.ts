import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCasePriority } from "@/db/schema/crm-case-priority";
import { crmCaseResolutionCode } from "@/db/schema/crm-case-resolution-code";
import { crmCaseSeverity } from "@/db/schema/crm-case-severity";
import { crmCaseStatus } from "@/db/schema/crm-case-status";
import { crmCaseType } from "@/db/schema/crm-case-type";
import { seedCrmCaseCatalogues } from "@/db/seeds/crm-case-catalogues-seed";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmCaseCatalogueRepository {
  async ensureDefaults(dbClient: DbClient = getDb()) {
    await seedCrmCaseCatalogues(dbClient);
  }

  async listActiveTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({ code: crmCaseType.code, name: crmCaseType.name })
      .from(crmCaseType)
      .where(eq(crmCaseType.isActive, true))
      .orderBy(asc(crmCaseType.displayOrder));
  }

  async listActivePriorities(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmCasePriority.code,
        name: crmCasePriority.name,
        firstResponseTargetHours: crmCasePriority.firstResponseTargetHours,
        resolutionTargetHours: crmCasePriority.resolutionTargetHours,
      })
      .from(crmCasePriority)
      .where(eq(crmCasePriority.isActive, true))
      .orderBy(asc(crmCasePriority.displayOrder));
  }

  async listActiveSeverities(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmCaseSeverity.code,
        name: crmCaseSeverity.name,
        requiresImmediateOwner: crmCaseSeverity.requiresImmediateOwner,
      })
      .from(crmCaseSeverity)
      .where(eq(crmCaseSeverity.isActive, true))
      .orderBy(asc(crmCaseSeverity.displayOrder));
  }

  async listActiveResolutionCodes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmCaseResolutionCode.code,
        name: crmCaseResolutionCode.name,
      })
      .from(crmCaseResolutionCode)
      .where(eq(crmCaseResolutionCode.isActive, true))
      .orderBy(asc(crmCaseResolutionCode.displayOrder));
  }

  async listActiveStatuses(dbClient: DbClient = getDb()) {
    return dbClient
      .select({ code: crmCaseStatus.code, name: crmCaseStatus.name })
      .from(crmCaseStatus)
      .where(eq(crmCaseStatus.isActive, true))
      .orderBy(asc(crmCaseStatus.displayOrder));
  }

  async findTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCaseType)
      .where(eq(crmCaseType.code, code))
      .limit(1);
    return row ?? null;
  }

  async findPriorityByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCasePriority)
      .where(eq(crmCasePriority.code, code))
      .limit(1);
    return row ?? null;
  }

  async findSeverityByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCaseSeverity)
      .where(eq(crmCaseSeverity.code, code))
      .limit(1);
    return row ?? null;
  }

  async findResolutionByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCaseResolutionCode)
      .where(eq(crmCaseResolutionCode.code, code))
      .limit(1);
    return row ?? null;
  }

  async findStatusByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmCaseStatus)
      .where(eq(crmCaseStatus.code, code))
      .limit(1);
    return row ?? null;
  }
}

export function createCrmCaseCatalogueRepository() {
  return new CrmCaseCatalogueRepository();
}
