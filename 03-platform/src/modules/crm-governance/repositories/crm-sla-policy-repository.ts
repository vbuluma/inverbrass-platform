import { and, asc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmSlaPolicy } from "@/db/schema/crm-sla-policy";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmSlaPolicyUpsertValues = {
  businessId: string;
  entityTypeCode: string;
  priorityCode?: string | null;
  name: string;
  firstResponseTargetHours?: number | null;
  resolutionTargetHours: number;
  pauseReasonCodes?: string[] | null;
  escalationEnabled?: boolean;
  isActive?: boolean;
};

export class CrmSlaPolicyRepository {
  async listByBusiness(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmSlaPolicy)
      .where(
        and(
          eq(crmSlaPolicy.businessId, businessId),
          isNull(crmSlaPolicy.deletedAt)
        )
      )
      .orderBy(asc(crmSlaPolicy.entityTypeCode), asc(crmSlaPolicy.priorityCode));
  }

  async findById(businessId: string, id: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select()
      .from(crmSlaPolicy)
      .where(
        and(
          eq(crmSlaPolicy.businessId, businessId),
          eq(crmSlaPolicy.id, id),
          isNull(crmSlaPolicy.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * Resolve active SLA policy for an entity type.
   * Prefer entity + priority match; else entity + null priority; else null.
   */
  async findActiveForEntity(
    businessId: string,
    entityTypeCode: string,
    priorityCode: string | null | undefined,
    dbClient: DbClient = getDb()
  ) {
    const base = and(
      eq(crmSlaPolicy.businessId, businessId),
      eq(crmSlaPolicy.entityTypeCode, entityTypeCode),
      eq(crmSlaPolicy.isActive, true),
      isNull(crmSlaPolicy.deletedAt)
    );

    if (priorityCode) {
      const [priorityMatch] = await dbClient
        .select()
        .from(crmSlaPolicy)
        .where(and(base, eq(crmSlaPolicy.priorityCode, priorityCode)))
        .limit(1);
      if (priorityMatch) return priorityMatch;
    }

    const [fallback] = await dbClient
      .select()
      .from(crmSlaPolicy)
      .where(and(base, isNull(crmSlaPolicy.priorityCode)))
      .limit(1);
    return fallback ?? null;
  }

  async insert(values: CrmSlaPolicyUpsertValues, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .insert(crmSlaPolicy)
      .values({
        businessId: values.businessId,
        entityTypeCode: values.entityTypeCode,
        priorityCode: values.priorityCode ?? null,
        name: values.name,
        firstResponseTargetHours: values.firstResponseTargetHours ?? null,
        resolutionTargetHours: values.resolutionTargetHours,
        pauseReasonCodes: values.pauseReasonCodes ?? null,
        escalationEnabled: values.escalationEnabled ?? true,
        isActive: values.isActive ?? true,
      })
      .returning();
    return row;
  }

  async updateById(
    businessId: string,
    id: string,
    values: Partial<CrmSlaPolicyUpsertValues>,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(crmSlaPolicy)
      .set({
        ...(values.entityTypeCode !== undefined
          ? { entityTypeCode: values.entityTypeCode }
          : {}),
        ...(values.priorityCode !== undefined
          ? { priorityCode: values.priorityCode }
          : {}),
        ...(values.name !== undefined ? { name: values.name } : {}),
        ...(values.firstResponseTargetHours !== undefined
          ? { firstResponseTargetHours: values.firstResponseTargetHours }
          : {}),
        ...(values.resolutionTargetHours !== undefined
          ? { resolutionTargetHours: values.resolutionTargetHours }
          : {}),
        ...(values.pauseReasonCodes !== undefined
          ? { pauseReasonCodes: values.pauseReasonCodes }
          : {}),
        ...(values.escalationEnabled !== undefined
          ? { escalationEnabled: values.escalationEnabled }
          : {}),
        ...(values.isActive !== undefined ? { isActive: values.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(crmSlaPolicy.businessId, businessId),
          eq(crmSlaPolicy.id, id),
          isNull(crmSlaPolicy.deletedAt)
        )
      )
      .returning();
    return row ?? null;
  }

  async countByBusiness(businessId: string, dbClient: DbClient = getDb()) {
    const rows = await this.listByBusiness(businessId, dbClient);
    return rows.length;
  }
}

export function createCrmSlaPolicyRepository() {
  return new CrmSlaPolicyRepository();
}
