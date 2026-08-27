import { and, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmGovernanceOwnershipHistory } from "@/db/schema/crm-governance-ownership-history";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmGovernanceOwnershipHistoryInsertValues = {
  businessId: string;
  governanceId: string;
  roleCode: string;
  userId: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  changedBy?: string | null;
};

export class CrmGovernanceOwnershipHistoryRepository {
  async insert(
    values: CrmGovernanceOwnershipHistoryInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmGovernanceOwnershipHistory)
      .values({
        businessId: values.businessId,
        governanceId: values.governanceId,
        roleCode: values.roleCode,
        userId: values.userId,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo ?? null,
        changedBy: values.changedBy ?? null,
      })
      .returning();
    return row;
  }

  async closeOpenAssignment(
    businessId: string,
    governanceId: string,
    roleCode: string,
    effectiveTo: Date,
    dbClient: DbClient = getDb()
  ) {
    const [open] = await dbClient
      .select()
      .from(crmGovernanceOwnershipHistory)
      .where(
        and(
          eq(crmGovernanceOwnershipHistory.businessId, businessId),
          eq(crmGovernanceOwnershipHistory.governanceId, governanceId),
          eq(crmGovernanceOwnershipHistory.roleCode, roleCode),
          isNull(crmGovernanceOwnershipHistory.effectiveTo)
        )
      )
      .orderBy(desc(crmGovernanceOwnershipHistory.effectiveFrom))
      .limit(1);

    if (!open) {
      return null;
    }

    const [row] = await dbClient
      .update(crmGovernanceOwnershipHistory)
      .set({ effectiveTo })
      .where(eq(crmGovernanceOwnershipHistory.id, open.id))
      .returning();
    return row ?? null;
  }

  async listByGovernanceId(
    businessId: string,
    governanceId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmGovernanceOwnershipHistory)
      .where(
        and(
          eq(crmGovernanceOwnershipHistory.businessId, businessId),
          eq(crmGovernanceOwnershipHistory.governanceId, governanceId)
        )
      )
      .orderBy(desc(crmGovernanceOwnershipHistory.effectiveFrom));
  }
}

export function createCrmGovernanceOwnershipHistoryRepository() {
  return new CrmGovernanceOwnershipHistoryRepository();
}
