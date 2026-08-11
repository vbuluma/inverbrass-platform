/**
 * Idempotent seed runner for CRM Activity metadata catalogues.
 * BP-004 / IP-05
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { crmActivityPriority } from "@/db/schema/crm-activity-priority";
import { crmActivityStatus } from "@/db/schema/crm-activity-status";
import { crmActivityType } from "@/db/schema/crm-activity-type";
import {
  crmActivityPriorities,
  crmActivityStatuses,
  crmActivityTypes,
} from "@/db/seeds/crm-activity-catalogues";

export async function seedCrmActivityCatalogues(
  db: PostgresJsDatabase<typeof schema>
) {
  for (const row of crmActivityTypes) {
    const [existing] = await db
      .select({ id: crmActivityType.id })
      .from(crmActivityType)
      .where(eq(crmActivityType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmActivityType).values({
        code: row.code,
        name: row.name,
        requiresCompletionNotes: row.requiresCompletionNotes,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmActivityType)
      .set({
        name: row.name,
        requiresCompletionNotes: row.requiresCompletionNotes,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmActivityType.id, existing.id));
  }

  for (const row of crmActivityStatuses) {
    const [existing] = await db
      .select({ id: crmActivityStatus.id })
      .from(crmActivityStatus)
      .where(eq(crmActivityStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmActivityStatus).values({
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
      .update(crmActivityStatus)
      .set({
        name: row.name,
        isTerminal: row.isTerminal,
        isEditable: row.isEditable,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmActivityStatus.id, existing.id));
  }

  for (const row of crmActivityPriorities) {
    const [existing] = await db
      .select({ id: crmActivityPriority.id })
      .from(crmActivityPriority)
      .where(eq(crmActivityPriority.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmActivityPriority).values({
        code: row.code,
        name: row.name,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmActivityPriority)
      .set({
        name: row.name,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmActivityPriority.id, existing.id));
  }
}
