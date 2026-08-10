/**
 * Purpose:
 * Read reference data for CRM Activity forms.
 */

import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { businessEmployee } from "@/db/schema/business-employee";
import { platformUser } from "@/db/schema/platform-user";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmActivityReferenceRepository {
  async listActiveOwners(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select({
        id: platformUser.id,
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
        displayName: platformUser.displayName,
      })
      .from(businessEmployee)
      .innerJoin(
        platformUser,
        eq(businessEmployee.platformUserId, platformUser.id)
      )
      .where(
        and(
          eq(businessEmployee.businessId, businessId),
          eq(businessEmployee.isActive, true),
          eq(platformUser.isActive, true)
        )
      )
      .orderBy(asc(platformUser.firstName), asc(platformUser.lastName));
  }

  async getOwnerDisplayName(
    userId: string,
    dbClient: DbClient = getDb()
  ): Promise<string | null> {
    const [row] = await dbClient
      .select({
        firstName: platformUser.firstName,
        lastName: platformUser.lastName,
        displayName: platformUser.displayName,
      })
      .from(platformUser)
      .where(eq(platformUser.id, userId))
      .limit(1);

    if (!row) return null;
    return (
      row.displayName?.trim() ||
      `${row.firstName} ${row.lastName}`.trim()
    );
  }
  async isOwnerAssignable(
    businessId: string,
    userId: string,
    dbClient: DbClient = getDb()
  ): Promise<boolean> {
    const [row] = await dbClient
      .select({ id: businessEmployee.id })
      .from(businessEmployee)
      .innerJoin(
        platformUser,
        eq(businessEmployee.platformUserId, platformUser.id)
      )
      .where(
        and(
          eq(businessEmployee.businessId, businessId),
          eq(businessEmployee.platformUserId, userId),
          eq(businessEmployee.isActive, true),
          eq(platformUser.isActive, true)
        )
      )
      .limit(1);

    return Boolean(row);
  }
}

export function createCrmActivityReferenceRepository() {
  return new CrmActivityReferenceRepository();
}
