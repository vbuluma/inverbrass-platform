import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCaseEntityLink } from "@/db/schema/crm-case-entity-link";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmCaseEntityLinkRepository {
  async insertMany(
    values: Array<{
      businessId: string;
      caseId: string;
      entityTypeCode: string;
      entityId: string;
      isPrimary?: boolean;
      createdBy?: string | null;
    }>,
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) return [];
    return dbClient.insert(crmCaseEntityLink).values(values).returning();
  }

  async listByCaseId(caseId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmCaseEntityLink)
      .where(eq(crmCaseEntityLink.caseId, caseId));
  }
}

export function createCrmCaseEntityLinkRepository() {
  return new CrmCaseEntityLinkRepository();
}
