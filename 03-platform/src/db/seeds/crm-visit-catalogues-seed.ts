/**
 * Idempotent seed runner for CRM Visit catalogues — BP-004 / IP-07
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { crmVisitStatus } from "@/db/schema/crm-visit-status";
import { crmVisitType } from "@/db/schema/crm-visit-type";
import { crmVisitStatuses, crmVisitTypes } from "@/db/seeds/crm-visit-catalogues";

export async function seedCrmVisitCatalogues(db: PostgresJsDatabase<typeof schema>) {
  for (const row of crmVisitTypes) {
    const [existing] = await db
      .select({ id: crmVisitType.id })
      .from(crmVisitType)
      .where(eq(crmVisitType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmVisitType).values({
        code: row.code,
        name: row.name,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmVisitType)
      .set({ name: row.name, displayOrder: row.displayOrder, updatedAt: new Date() })
      .where(eq(crmVisitType.id, existing.id));
  }

  for (const row of crmVisitStatuses) {
    const [existing] = await db
      .select({ id: crmVisitStatus.id })
      .from(crmVisitStatus)
      .where(eq(crmVisitStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmVisitStatus).values({
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
      .update(crmVisitStatus)
      .set({
        name: row.name,
        isTerminal: row.isTerminal,
        isEditable: row.isEditable,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmVisitStatus.id, existing.id));
  }
}
