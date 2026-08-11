import { and, asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmHolidayCalendar } from "@/db/schema/crm-holiday-calendar";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmHolidayCalendarRepository {
  async listByBusiness(businessId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmHolidayCalendar)
      .where(eq(crmHolidayCalendar.businessId, businessId))
      .orderBy(asc(crmHolidayCalendar.holidayDate));
  }

  async upsert(
    businessId: string,
    values: {
      id?: string;
      holidayDate: string;
      name: string;
      isRecurring?: boolean;
    },
    dbClient: DbClient = getDb()
  ) {
    if (values.id) {
      const [row] = await dbClient
        .update(crmHolidayCalendar)
        .set({
          holidayDate: values.holidayDate,
          name: values.name,
          isRecurring: values.isRecurring ?? false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(crmHolidayCalendar.businessId, businessId),
            eq(crmHolidayCalendar.id, values.id)
          )
        )
        .returning();
      return row ?? null;
    }

    const [existing] = await dbClient
      .select()
      .from(crmHolidayCalendar)
      .where(
        and(
          eq(crmHolidayCalendar.businessId, businessId),
          eq(crmHolidayCalendar.holidayDate, values.holidayDate)
        )
      )
      .limit(1);

    if (existing) {
      const [row] = await dbClient
        .update(crmHolidayCalendar)
        .set({
          name: values.name,
          isRecurring: values.isRecurring ?? false,
          updatedAt: new Date(),
        })
        .where(eq(crmHolidayCalendar.id, existing.id))
        .returning();
      return row;
    }

    const [row] = await dbClient
      .insert(crmHolidayCalendar)
      .values({
        businessId,
        holidayDate: values.holidayDate,
        name: values.name,
        isRecurring: values.isRecurring ?? false,
      })
      .returning();
    return row;
  }
}

export function createCrmHolidayCalendarRepository() {
  return new CrmHolidayCalendarRepository();
}
