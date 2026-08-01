/**
 * Purpose:
 * Append-only offering governance history persistence.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringGovernanceHistory } from "@/db/schema/offering-governance-history";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingGovernanceHistoryInsertValues = {
  businessId: string;
  offeringGovernanceId: string;
  changeType: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class OfferingGovernanceHistoryRepository {
  async insert(
    values: OfferingGovernanceHistoryInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(offeringGovernanceHistory)
      .values({
        businessId: values.businessId,
        offeringGovernanceId: values.offeringGovernanceId,
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
    businessId: string,
    offeringGovernanceId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(offeringGovernanceHistory)
      .where(
        eq(offeringGovernanceHistory.offeringGovernanceId, offeringGovernanceId)
      )
      .orderBy(desc(offeringGovernanceHistory.changeDate));
  }
}

export function createOfferingGovernanceHistoryRepository(): OfferingGovernanceHistoryRepository {
  return new OfferingGovernanceHistoryRepository();
}
