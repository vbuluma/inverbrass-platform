/**
 * Purpose:
 * Idempotent seed runner for opportunity pipelines, stages, and loss reasons.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { opportunityLossReason } from "@/db/schema/opportunity-loss-reason";
import { opportunityPipeline } from "@/db/schema/opportunity-pipeline";
import { opportunityStage } from "@/db/schema/opportunity-stage";
import {
  opportunityLossReasons,
  opportunityPipelines,
  opportunityStagesByPipeline,
} from "@/db/seeds/opportunity-reference";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

export async function seedOpportunityReference(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = { inserted: 0, updated: 0, skipped: 0 };

  for (const row of opportunityPipelines) {
    const [existing] = await db
      .select({ id: opportunityPipeline.id })
      .from(opportunityPipeline)
      .where(eq(opportunityPipeline.code, row.code))
      .limit(1);

    let pipelineId: string;

    if (!existing) {
      const [inserted] = await db
        .insert(opportunityPipeline)
        .values(row)
        .returning({ id: opportunityPipeline.id });
      pipelineId = inserted!.id;
      counts.inserted += 1;
    } else {
      pipelineId = existing.id;
      await db
        .update(opportunityPipeline)
        .set({
          name: row.name,
          description: row.description,
          displayOrder: row.displayOrder,
          isActive: row.isActive,
          updatedAt: new Date(),
        })
        .where(eq(opportunityPipeline.id, existing.id));
      counts.updated += 1;
    }

    const stages = opportunityStagesByPipeline[row.code] ?? [];
    for (const stage of stages) {
      const [existingStage] = await db
        .select({ id: opportunityStage.id })
        .from(opportunityStage)
        .where(eq(opportunityStage.code, stage.code))
        .limit(1);

      if (!existingStage) {
        await db.insert(opportunityStage).values({
          pipelineId,
          code: stage.code,
          name: stage.name,
          description: stage.description ?? null,
          displayOrder: stage.displayOrder,
          defaultProbability: stage.defaultProbability,
          isClosedWon: stage.isClosedWon ?? false,
          isClosedLost: stage.isClosedLost ?? false,
          isActive: stage.isActive,
        });
        counts.inserted += 1;
      } else {
        await db
          .update(opportunityStage)
          .set({
            pipelineId,
            name: stage.name,
            description: stage.description ?? null,
            displayOrder: stage.displayOrder,
            defaultProbability: stage.defaultProbability,
            isClosedWon: stage.isClosedWon ?? false,
            isClosedLost: stage.isClosedLost ?? false,
            isActive: stage.isActive,
            updatedAt: new Date(),
          })
          .where(eq(opportunityStage.id, existingStage.id));
        counts.updated += 1;
      }
    }
  }

  for (const row of opportunityLossReasons) {
    const [existing] = await db
      .select({ id: opportunityLossReason.id })
      .from(opportunityLossReason)
      .where(eq(opportunityLossReason.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(opportunityLossReason).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(opportunityLossReason)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(opportunityLossReason.id, existing.id));
    counts.updated += 1;
  }

  return counts;
}
