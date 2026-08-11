import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmCaseEscalation } from "@/db/schema/crm-case-escalation";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmCaseEscalationRepository {
  async insert(
    values: {
      businessId: string;
      caseId: string;
      fromOwnerUserId?: string | null;
      toOwnerUserId?: string | null;
      reason: string;
      triggeredBy: string;
      createdBy?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmCaseEscalation)
      .values({
        businessId: values.businessId,
        caseId: values.caseId,
        fromOwnerUserId: values.fromOwnerUserId ?? null,
        toOwnerUserId: values.toOwnerUserId ?? null,
        reason: values.reason,
        triggeredBy: values.triggeredBy,
        createdBy: values.createdBy ?? null,
      })
      .returning();
    return row;
  }

  async listByCaseId(caseId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmCaseEscalation)
      .where(eq(crmCaseEscalation.caseId, caseId))
      .orderBy(desc(crmCaseEscalation.createdAt));
  }
}

export function createCrmCaseEscalationRepository() {
  return new CrmCaseEscalationRepository();
}
