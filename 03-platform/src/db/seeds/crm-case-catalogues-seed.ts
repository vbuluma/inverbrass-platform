/**
 * Idempotent seed runner for CRM Case catalogues — BP-004 / IP-09
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "@/db/schema";
import { crmCasePriority } from "@/db/schema/crm-case-priority";
import { crmCaseResolutionCode } from "@/db/schema/crm-case-resolution-code";
import { crmCaseSeverity } from "@/db/schema/crm-case-severity";
import { crmCaseStatus } from "@/db/schema/crm-case-status";
import { crmCaseType } from "@/db/schema/crm-case-type";
import {
  crmCasePriorities,
  crmCaseResolutionCodes,
  crmCaseSeverities,
  crmCaseStatuses,
  crmCaseTypes,
} from "@/db/seeds/crm-case-catalogues";

export async function seedCrmCaseCatalogues(db: PostgresJsDatabase<typeof schema>) {
  for (const row of crmCaseTypes) {
    const [existing] = await db
      .select({ id: crmCaseType.id })
      .from(crmCaseType)
      .where(eq(crmCaseType.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmCaseType).values({
        code: row.code,
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmCaseType)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmCaseType.id, existing.id));
  }

  for (const row of crmCaseStatuses) {
    const [existing] = await db
      .select({ id: crmCaseStatus.id })
      .from(crmCaseStatus)
      .where(eq(crmCaseStatus.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmCaseStatus).values({
        code: row.code,
        name: row.name,
        isTerminal: row.isTerminal,
        isEditable: row.isEditable,
        pausesSla: row.pausesSla,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmCaseStatus)
      .set({
        name: row.name,
        isTerminal: row.isTerminal,
        isEditable: row.isEditable,
        pausesSla: row.pausesSla,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmCaseStatus.id, existing.id));
  }

  for (const row of crmCasePriorities) {
    const [existing] = await db
      .select({ id: crmCasePriority.id })
      .from(crmCasePriority)
      .where(eq(crmCasePriority.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmCasePriority).values({
        code: row.code,
        name: row.name,
        displayOrder: row.displayOrder,
        firstResponseTargetHours: row.firstResponseTargetHours,
        resolutionTargetHours: row.resolutionTargetHours,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmCasePriority)
      .set({
        name: row.name,
        displayOrder: row.displayOrder,
        firstResponseTargetHours: row.firstResponseTargetHours,
        resolutionTargetHours: row.resolutionTargetHours,
        updatedAt: new Date(),
      })
      .where(eq(crmCasePriority.id, existing.id));
  }

  for (const row of crmCaseSeverities) {
    const [existing] = await db
      .select({ id: crmCaseSeverity.id })
      .from(crmCaseSeverity)
      .where(eq(crmCaseSeverity.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmCaseSeverity).values({
        code: row.code,
        name: row.name,
        requiresImmediateOwner: row.requiresImmediateOwner,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmCaseSeverity)
      .set({
        name: row.name,
        requiresImmediateOwner: row.requiresImmediateOwner,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmCaseSeverity.id, existing.id));
  }

  for (const row of crmCaseResolutionCodes) {
    const [existing] = await db
      .select({ id: crmCaseResolutionCode.id })
      .from(crmCaseResolutionCode)
      .where(eq(crmCaseResolutionCode.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(crmCaseResolutionCode).values({
        code: row.code,
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: true,
      });
      continue;
    }

    await db
      .update(crmCaseResolutionCode)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(crmCaseResolutionCode.id, existing.id));
  }
}
