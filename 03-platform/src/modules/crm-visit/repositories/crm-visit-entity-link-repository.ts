import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisitEntityLink } from "@/db/schema/crm-visit-entity-link";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmVisitEntityLinkRepository {
  async insertMany(
    values: Array<{
      businessId: string;
      visitId: string;
      entityTypeCode: string;
      entityId: string;
      isPrimary?: boolean;
      createdBy?: string | null;
    }>,
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) return [];
    return dbClient.insert(crmVisitEntityLink).values(values).returning();
  }

  async listByVisitId(visitId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmVisitEntityLink)
      .where(eq(crmVisitEntityLink.visitId, visitId));
  }
}

export function createCrmVisitEntityLinkRepository() {
  return new CrmVisitEntityLinkRepository();
}
