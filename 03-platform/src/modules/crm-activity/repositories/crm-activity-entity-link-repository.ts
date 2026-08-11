/**
 * Purpose:
 * Persist CRM Activity entity links.
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmActivityEntityLink } from "@/db/schema/crm-activity-entity-link";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmActivityEntityLinkInsertValues = {
  businessId: string;
  activityId: string;
  entityTypeCode: string;
  entityId: string;
  isPrimary?: boolean;
  createdBy?: string | null;
};

export class CrmActivityEntityLinkRepository {
  async insertMany(
    values: CrmActivityEntityLinkInsertValues[],
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) return [];
    return dbClient.insert(crmActivityEntityLink).values(values).returning();
  }

  async listByActivityId(
    businessId: string,
    activityId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmActivityEntityLink)
      .where(
        and(
          eq(crmActivityEntityLink.businessId, businessId),
          eq(crmActivityEntityLink.activityId, activityId)
        )
      );
  }

  async deleteByActivityId(
    businessId: string,
    activityId: string,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .delete(crmActivityEntityLink)
      .where(
        and(
          eq(crmActivityEntityLink.businessId, businessId),
          eq(crmActivityEntityLink.activityId, activityId)
        )
      );
  }
}

export function createCrmActivityEntityLinkRepository() {
  return new CrmActivityEntityLinkRepository();
}
