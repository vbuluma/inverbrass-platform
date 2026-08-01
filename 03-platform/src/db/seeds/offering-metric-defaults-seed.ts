/**
 * Purpose:
 * Idempotent seed of default offering metric definitions per business.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { offeringMetricDefinition } from "@/db/schema/offering-metric-definition";
import { defaultOfferingMetricDefinitions } from "@/db/seeds/offering-metric-defaults";

type DbClient = PostgresJsDatabase<typeof schema>;

export type OfferingMetricDefaultsSeedResult = {
  inserted: number;
  skipped: number;
};

export async function seedDefaultOfferingMetricsForBusiness(
  businessId: string,
  db: DbClient = getDb(),
  createdBy?: string | null
): Promise<OfferingMetricDefaultsSeedResult> {
  let inserted = 0;
  let skipped = 0;

  for (const template of defaultOfferingMetricDefinitions) {
    const [existing] = await db
      .select({ id: offeringMetricDefinition.id })
      .from(offeringMetricDefinition)
      .where(
        and(
          eq(offeringMetricDefinition.businessId, businessId),
          eq(offeringMetricDefinition.code, template.code),
          isNull(offeringMetricDefinition.deletedAt)
        )
      )
      .limit(1);

    if (existing) {
      skipped += 1;
      continue;
    }

    await db.insert(offeringMetricDefinition).values({
      businessId,
      code: template.code,
      name: template.name,
      description: template.description,
      metricCategory: template.metricCategory,
      calculationMethod: template.calculationMethod,
      unitOfMeasure: template.unitOfMeasure ?? null,
      isActive: true,
      createdBy: createdBy ?? null,
      updatedBy: createdBy ?? null,
    });

    inserted += 1;
  }

  return { inserted, skipped };
}
