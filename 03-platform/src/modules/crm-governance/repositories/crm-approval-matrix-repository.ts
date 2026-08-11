import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmApprovalMatrix } from "@/db/schema/crm-approval-matrix";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmApprovalMatrixRepository {
  async listByBusiness(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmApprovalMatrix)
      .where(eq(crmApprovalMatrix.businessId, businessId))
      .orderBy(asc(crmApprovalMatrix.actionCode));
  }

  async upsert(
    businessId: string,
    values: {
      id?: string;
      actionCode: string;
      minRoleCode: string;
      requiresDualApproval?: boolean;
      isActive?: boolean;
      metadata?: Record<string, unknown> | null;
    },
    dbClient: DbClient = getDb()
  ) {
    if (values.id) {
      const [row] = await dbClient
        .update(crmApprovalMatrix)
        .set({
          actionCode: values.actionCode,
          minRoleCode: values.minRoleCode,
          requiresDualApproval: values.requiresDualApproval ?? false,
          isActive: values.isActive ?? true,
          metadata: values.metadata ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmApprovalMatrix.businessId, businessId),
            eq(crmApprovalMatrix.id, values.id)
          )
        )
        .returning();
      return row ?? null;
    }

    const [existing] = await dbClient
      .select()
      .from(crmApprovalMatrix)
      .where(
        and(
          eq(crmApprovalMatrix.businessId, businessId),
          eq(crmApprovalMatrix.actionCode, values.actionCode)
        )
      )
      .limit(1);

    if (existing) {
      const [row] = await dbClient
        .update(crmApprovalMatrix)
        .set({
          minRoleCode: values.minRoleCode,
          requiresDualApproval: values.requiresDualApproval ?? false,
          isActive: values.isActive ?? true,
          metadata: values.metadata ?? null,
          updatedAt: new Date(),
        })
        .where(eq(crmApprovalMatrix.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await dbClient
      .insert(crmApprovalMatrix)
      .values({
        businessId,
        actionCode: values.actionCode,
        minRoleCode: values.minRoleCode,
        requiresDualApproval: values.requiresDualApproval ?? false,
        isActive: values.isActive ?? true,
        metadata: values.metadata ?? null,
      })
      .returning();
    return row;
  }
}

export function createCrmApprovalMatrixRepository() {
  return new CrmApprovalMatrixRepository();
}
