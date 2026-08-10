/**
 * Polymorphic entity links for appointments.
 * BP-004 / IP-06
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmAppointmentEntityLink } from "@/db/schema/crm-appointment-entity-link";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmAppointmentEntityLinkInsertValues = {
  businessId: string;
  appointmentId: string;
  entityTypeCode: string;
  entityId: string;
  isPrimary?: boolean;
  createdBy?: string | null;
};

export class CrmAppointmentEntityLinkRepository {
  async insertMany(
    values: CrmAppointmentEntityLinkInsertValues[],
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) return [];
    return dbClient.insert(crmAppointmentEntityLink).values(values).returning();
  }

  async listByAppointmentId(
    businessId: string,
    appointmentId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmAppointmentEntityLink)
      .where(eq(crmAppointmentEntityLink.appointmentId, appointmentId));
  }
}

export function createCrmAppointmentEntityLinkRepository() {
  return new CrmAppointmentEntityLinkRepository();
}
