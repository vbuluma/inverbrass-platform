/**
 * Purpose:
 * Idempotent seed of governance statuses and checklist definitions.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringGovernanceChecklistDefinition } from "@/db/schema/offering-governance-checklist-definition";
import { offeringGovernanceStatus } from "@/db/schema/offering-governance-status";
import {
  defaultOfferingGovernanceChecklist,
  defaultOfferingGovernanceStatuses,
} from "@/db/seeds/offering-governance-defaults";

type DbClient = PostgresJsDatabase<typeof schema>;

export async function seedOfferingGovernanceReferenceData(
  db: DbClient = getDb()
): Promise<void> {
  for (const status of defaultOfferingGovernanceStatuses) {
    const [existing] = await db
      .select({ id: offeringGovernanceStatus.id })
      .from(offeringGovernanceStatus)
      .where(eq(offeringGovernanceStatus.code, status.code))
      .limit(1);

    if (!existing) {
      await db.insert(offeringGovernanceStatus).values({
        code: status.code,
        name: status.name,
        description: status.description,
        displayOrder: status.displayOrder,
        isActive: true,
      });
    }
  }
}

export async function seedDefaultGovernanceChecklistForBusiness(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  for (const item of defaultOfferingGovernanceChecklist) {
    const [existing] = await db
      .select({ id: offeringGovernanceChecklistDefinition.id })
      .from(offeringGovernanceChecklistDefinition)
      .where(
        and(
          eq(offeringGovernanceChecklistDefinition.businessId, businessId),
          eq(offeringGovernanceChecklistDefinition.code, item.code)
        )
      )
      .limit(1);

    if (existing) {
      continue;
    }

    await db.insert(offeringGovernanceChecklistDefinition).values({
      businessId,
      code: item.code,
      name: item.name,
      description: item.description,
      sourceModule: item.sourceModule,
      evaluatorKey: item.evaluatorKey,
      isMandatory: item.isMandatory,
      weight: item.weight,
      displayOrder: item.displayOrder,
      isActive: true,
    });
  }
}

export async function ensureOfferingGovernanceDefaults(
  businessId: string,
  db: DbClient = getDb()
): Promise<void> {
  await seedOfferingGovernanceReferenceData(db);
  await seedDefaultGovernanceChecklistForBusiness(businessId, db);
}
