/**
 * Purpose:
 * Opportunity reference catalogue reads.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { opportunityLossReason } from "@/db/schema/opportunity-loss-reason";
import { opportunityPipeline } from "@/db/schema/opportunity-pipeline";
import { opportunityStage } from "@/db/schema/opportunity-stage";

export class OpportunityReferenceRepository {
  async listActivePipelines() {
    const db = getDb();
    return db
      .select({
        id: opportunityPipeline.id,
        code: opportunityPipeline.code,
        name: opportunityPipeline.name,
        description: opportunityPipeline.description,
      })
      .from(opportunityPipeline)
      .where(eq(opportunityPipeline.isActive, true))
      .orderBy(asc(opportunityPipeline.displayOrder));
  }

  async listActiveStages(pipelineId?: string) {
    const db = getDb();
    const conditions = [eq(opportunityStage.isActive, true)];
    if (pipelineId) {
      conditions.push(eq(opportunityStage.pipelineId, pipelineId));
    }

    return db
      .select({
        pipelineId: opportunityStage.pipelineId,
        code: opportunityStage.code,
        name: opportunityStage.name,
        description: opportunityStage.description,
        displayOrder: opportunityStage.displayOrder,
        defaultProbability: opportunityStage.defaultProbability,
        isClosedWon: opportunityStage.isClosedWon,
        isClosedLost: opportunityStage.isClosedLost,
      })
      .from(opportunityStage)
      .where(and(...conditions))
      .orderBy(asc(opportunityStage.displayOrder));
  }

  async listActiveLossReasons() {
    const db = getDb();
    return db
      .select({
        code: opportunityLossReason.code,
        name: opportunityLossReason.name,
        description: opportunityLossReason.description,
      })
      .from(opportunityLossReason)
      .where(eq(opportunityLossReason.isActive, true))
      .orderBy(asc(opportunityLossReason.displayOrder));
  }

  async findPipelineByCode(code: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(opportunityPipeline)
      .where(and(eq(opportunityPipeline.code, code), eq(opportunityPipeline.isActive, true)))
      .limit(1);
    return row ?? null;
  }

  async getPipelineName(code: string): Promise<string> {
    const db = getDb();
    const [row] = await db
      .select({ name: opportunityPipeline.name })
      .from(opportunityPipeline)
      .where(eq(opportunityPipeline.code, code))
      .limit(1);
    return row?.name ?? code;
  }

  async getStageByPipelineAndCode(pipelineId: string, stageCode: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(opportunityStage)
      .where(
        and(
          eq(opportunityStage.pipelineId, pipelineId),
          eq(opportunityStage.code, stageCode),
          eq(opportunityStage.isActive, true)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async getStageName(pipelineId: string, stageCode: string): Promise<string> {
    const stage = await this.getStageByPipelineAndCode(pipelineId, stageCode);
    return stage?.name ?? stageCode;
  }

  async getLossReasonName(code: string): Promise<string | null> {
    const db = getDb();
    const [row] = await db
      .select({ name: opportunityLossReason.name })
      .from(opportunityLossReason)
      .where(eq(opportunityLossReason.code, code))
      .limit(1);
    return row?.name ?? null;
  }

  async isActiveLossReason(code: string): Promise<boolean> {
    const db = getDb();
    const [row] = await db
      .select({ id: opportunityLossReason.id })
      .from(opportunityLossReason)
      .where(eq(opportunityLossReason.code, code))
      .limit(1);
    return Boolean(row);
  }
}

export function createOpportunityReferenceRepository(): OpportunityReferenceRepository {
  return new OpportunityReferenceRepository();
}
