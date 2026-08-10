import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmBusinessHours } from "@/db/schema/crm-business-hours";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmBusinessHoursRepository {
  async listByBusiness(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmBusinessHours)
      .where(eq(crmBusinessHours.businessId, businessId))
      .orderBy(asc(crmBusinessHours.dayOfWeek));
  }

  async upsertDay(
    businessId: string,
    values: {
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isClosed?: boolean;
      timezone?: string;
    },
    dbClient: DbClient = getDb()
  ) {
    const [existing] = await dbClient
      .select()
      .from(crmBusinessHours)
      .where(
        and(
          eq(crmBusinessHours.businessId, businessId),
          eq(crmBusinessHours.dayOfWeek, values.dayOfWeek)
        )
      )
      .limit(1);

    if (existing) {
      const [row] = await dbClient
        .update(crmBusinessHours)
        .set({
          openTime: values.openTime,
          closeTime: values.closeTime,
          isClosed: values.isClosed ?? false,
          timezone: values.timezone ?? existing.timezone,
          updatedAt: new Date(),
        })
        .where(eq(crmBusinessHours.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await dbClient
      .insert(crmBusinessHours)
      .values({
        businessId,
        dayOfWeek: values.dayOfWeek,
        openTime: values.openTime,
        closeTime: values.closeTime,
        isClosed: values.isClosed ?? false,
        timezone: values.timezone ?? "UTC",
      })
      .returning();
    return row;
  }
}

export function createCrmBusinessHoursRepository() {
  return new CrmBusinessHoursRepository();
}
