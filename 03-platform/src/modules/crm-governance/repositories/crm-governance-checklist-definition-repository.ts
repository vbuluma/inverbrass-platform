import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmGovernanceChecklistDefinition } from "@/db/schema/crm-governance-checklist-definition";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmGovernanceChecklistDefinitionRepository {
  async listActiveByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmGovernanceChecklistDefinition)
      .where(
        and(
          eq(crmGovernanceChecklistDefinition.businessId, businessId),
          eq(crmGovernanceChecklistDefinition.isActive, true)
        )
      )
      .orderBy(
        asc(crmGovernanceChecklistDefinition.displayOrder),
        asc(crmGovernanceChecklistDefinition.name)
      );
  }
}

export function createCrmGovernanceChecklistDefinitionRepository() {
  return new CrmGovernanceChecklistDefinitionRepository();
}
