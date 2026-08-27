import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmGovernanceHistory } from "@/db/schema/crm-governance-history";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmGovernanceHistoryInsertValues = {
  businessId: string;
  crmGovernanceId: string;
  changeType: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class CrmGovernanceHistoryRepository {
  async insert(
    values: CrmGovernanceHistoryInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmGovernanceHistory)
      .values({
        businessId: values.businessId,
        crmGovernanceId: values.crmGovernanceId,
        changeType: values.changeType,
        oldValue: values.oldValue ?? null,
        newValue: values.newValue ?? null,
        changedBy: values.changedBy ?? null,
        metadata: values.metadata ?? null,
      })
      .returning();
    return row;
  }

  async listByGovernanceId(
    _businessId: string,
    crmGovernanceId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmGovernanceHistory)
      .where(eq(crmGovernanceHistory.crmGovernanceId, crmGovernanceId))
      .orderBy(desc(crmGovernanceHistory.changeDate));
  }
}

export function createCrmGovernanceHistoryRepository() {
  return new CrmGovernanceHistoryRepository();
}
