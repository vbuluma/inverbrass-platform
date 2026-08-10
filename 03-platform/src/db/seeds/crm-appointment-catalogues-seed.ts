/**
 * Idempotent seed runner for CRM Appointment metadata catalogues.
 * BP-004 / IP-06
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { crmAppointmentStatus } from "@/db/schema/crm-appointment-status";
import { crmAppointmentType } from "@/db/schema/crm-appointment-type";
import {
  crmAppointmentStatuses,
  crmAppointmentTypes,
} from "@/db/seeds/crm-appointment-catalogues";

export async function seedCrmAppointmentCatalogues(
  db: PostgresJsDatabase<typeof schema>
) {
  for (const row of crmAppointmentTypes) {
    const [existing] = await db
      .select({ id: crmAppointmentType.id })
      .from(crmAppointmentType)
      .where(eq(crmAppointmentType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmAppointmentType).values({
        code: row.code,
        name: row.name,
        defaultDurationMinutes: row.defaultDurationMinutes,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmAppointmentType)
      .set({
        name: row.name,
        defaultDurationMinutes: row.defaultDurationMinutes,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmAppointmentType.id, existing.id));
  }

  for (const row of crmAppointmentStatuses) {
    const [existing] = await db
      .select({ id: crmAppointmentStatus.id })
      .from(crmAppointmentStatus)
      .where(eq(crmAppointmentStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmAppointmentStatus).values({
        code: row.code,
        name: row.name,
        isTerminal: row.isTerminal,
        isEditable: row.isEditable,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmAppointmentStatus)
      .set({
        name: row.name,
        isTerminal: row.isTerminal,
        isEditable: row.isEditable,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmAppointmentStatus.id, existing.id));
  }
}
