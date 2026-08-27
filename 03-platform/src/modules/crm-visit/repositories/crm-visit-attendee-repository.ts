import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmVisitCustomerAttendee } from "@/db/schema/crm-visit-customer-attendee";

type DbClient = PostgresJsDatabase<typeof schema>;

export class CrmVisitAttendeeRepository {
  async insert(
    values: {
      businessId: string;
      visitId: string;
      displayName: string;
      partyId?: string | null;
      positionTitle?: string | null;
      email?: string | null;
      mobile?: string | null;
      organisation?: string | null;
      wasPresent?: boolean;
      createdBy?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(crmVisitCustomerAttendee)
      .values({
        businessId: values.businessId,
        visitId: values.visitId,
        displayName: values.displayName,
        partyId: values.partyId ?? null,
        positionTitle: values.positionTitle ?? null,
        email: values.email ?? null,
        mobile: values.mobile ?? null,
        organisation: values.organisation ?? null,
        wasPresent: values.wasPresent ?? true,
        createdBy: values.createdBy ?? null,
      })
      .returning();
    return row;
  }

  async listByVisitId(visitId: string, dbClient: DbClient = getDb()) {
    return dbClient
      .select()
      .from(crmVisitCustomerAttendee)
      .where(eq(crmVisitCustomerAttendee.visitId, visitId))
      .orderBy(asc(crmVisitCustomerAttendee.createdAt));
  }
}

export function createCrmVisitAttendeeRepository() {
  return new CrmVisitAttendeeRepository();
}
