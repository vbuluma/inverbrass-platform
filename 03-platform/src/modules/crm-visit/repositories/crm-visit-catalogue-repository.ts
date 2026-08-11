import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisitStatus } from "@/db/schema/crm-visit-status";
import { crmVisitType } from "@/db/schema/crm-visit-type";
import { seedCrmVisitCatalogues } from "@/db/seeds/crm-visit-catalogues-seed";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmVisitCatalogueRepository {
  async ensureDefaults(dbClient: DbClient = getDb()) {
    await seedCrmVisitCatalogues(dbClient);
  }

  async listActiveTypes(dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        code: crmVisitType.code,
        name: crmVisitType.name,
      })
      .from(crmVisitType)
      .where(eq(crmVisitType.isActive, true))
      .orderBy(asc(crmVisitType.displayOrder));
  }

  async findTypeByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmVisitType)
      .where(eq(crmVisitType.code, code))
      .limit(1);
    return row ?? null;
  }

  async findStatusByCode(code: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmVisitStatus)
      .where(eq(crmVisitStatus.code, code))
      .limit(1);
    return row ?? null;
  }
}

export function createCrmVisitCatalogueRepository() {
  return new CrmVisitCatalogueRepository();
}
