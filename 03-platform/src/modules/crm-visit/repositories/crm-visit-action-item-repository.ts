import { and, asc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisitActionItem } from "@/db/schema/crm-visit-action-item";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmVisitActionItemRepository {
  async insert(
    values: {
      businessId: string;
      visitId: string;
      title: string;
      description?: string | null;
      ownerUserId: string;
      dueDate: Date;
      priorityCode?: string;
      statusCode?: string;
      createdBy?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmVisitActionItem)
      .values({
        businessId: values.businessId,
        visitId: values.visitId,
        title: values.title,
        description: values.description ?? null,
        ownerUserId: values.ownerUserId,
        dueDate: values.dueDate,
        priorityCode: values.priorityCode ?? "NORMAL",
        statusCode: values.statusCode ?? "OPEN",
        createdBy: values.createdBy ?? null,
        updatedBy: values.createdBy ?? null,
      })
      .returning();
    return row;
  }

  async updateById(
    businessId: string,
    actionItemId: string,
    values: Record<string, unknown>,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmVisitActionItem)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(
          eq(crmVisitActionItem.businessId, businessId),
          eq(crmVisitActionItem.id, actionItemId)
        )
      )
      .returning();
    return row ?? null;
  }

  async findById(businessId: string, actionItemId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmVisitActionItem)
      .where(
        and(
          eq(crmVisitActionItem.businessId, businessId),
          eq(crmVisitActionItem.id, actionItemId)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async listByVisitId(visitId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmVisitActionItem)
      .where(eq(crmVisitActionItem.visitId, visitId))
      .orderBy(asc(crmVisitActionItem.dueDate));
  }

  async listOpenByOwner(
    businessId: string,
    ownerUserId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmVisitActionItem)
      .where(
        and(
          eq(crmVisitActionItem.businessId, businessId),
          eq(crmVisitActionItem.ownerUserId, ownerUserId),
          inArray(crmVisitActionItem.statusCode, ["OPEN", "IN_PROGRESS"])
        )
      )
      .orderBy(asc(crmVisitActionItem.dueDate));
  }

  async listOpenByPartyVisits(
    visitIds: string[],
    dbClient: DbClient = getDb()
  ) {
    if (visitIds.length === 0) return [];
    return dbClient
      .select()
      .from(crmVisitActionItem)
      .where(
        and(
          inArray(crmVisitActionItem.visitId, visitIds),
          inArray(crmVisitActionItem.statusCode, ["OPEN", "IN_PROGRESS"])
        )
      )
      .orderBy(asc(crmVisitActionItem.dueDate));
  }
}

export function createCrmVisitActionItemRepository() {
  return new CrmVisitActionItemRepository();
}
