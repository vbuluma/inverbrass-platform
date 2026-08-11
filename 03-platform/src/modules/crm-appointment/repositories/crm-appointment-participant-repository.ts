/**
 * Appointment participant persistence.
 * BP-004 / IP-06
 */

import { asc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { crmAppointmentParticipant } from "@/db/schema/crm-appointment-participant";

type DbClient = PostgresJsDatabase<typeof schema>;

export type CrmAppointmentParticipantInsertValues = {
  businessId: string;
  appointmentId: string;
  participantKind: string;
  userId?: string | null;
  externalPartyId?: string | null;
  displayName?: string | null;
  responseStatusCode?: string;
  isOrganizer?: boolean;
  createdBy?: string | null;
};

export class CrmAppointmentParticipantRepository {
  async insertMany(
    values: CrmAppointmentParticipantInsertValues[],
    dbClient: DbClient = getDb()
  ) {
    if (values.length === 0) return [];
    return dbClient.insert(crmAppointmentParticipant).values(values).returning();
  }

  async listByAppointmentId(
    businessId: string,
    appointmentId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(crmAppointmentParticipant)
      .where(
        eq(crmAppointmentParticipant.appointmentId, appointmentId)
      )
      .orderBy(asc(crmAppointmentParticipant.isOrganizer));
  }

  async deleteByAppointmentId(
    businessId: string,
    appointmentId: string,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .delete(crmAppointmentParticipant)
      .where(eq(crmAppointmentParticipant.appointmentId, appointmentId));
  }
}

export function createCrmAppointmentParticipantRepository() {
  return new CrmAppointmentParticipantRepository();
}
