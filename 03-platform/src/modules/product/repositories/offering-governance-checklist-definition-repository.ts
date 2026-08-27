/**
 * Purpose:
 * Read metadata-driven governance checklist definitions.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringGovernanceChecklistDefinition } from "@/db/schema/offering-governance-checklist-definition";

type DbClient = PostgresJsDatabase<typeof schema>;

export class OfferingGovernanceChecklistDefinitionRepository {
  async listActiveByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(offeringGovernanceChecklistDefinition)
      .where(
        and(
          eq(offeringGovernanceChecklistDefinition.businessId, businessId),
          eq(offeringGovernanceChecklistDefinition.isActive, true)
        )
      )
      .orderBy(
        asc(offeringGovernanceChecklistDefinition.displayOrder),
        asc(offeringGovernanceChecklistDefinition.name)
      );
  }
}

export function createOfferingGovernanceChecklistDefinitionRepository(): OfferingGovernanceChecklistDefinitionRepository {
  return new OfferingGovernanceChecklistDefinitionRepository();
}
