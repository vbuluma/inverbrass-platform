/**
 * Purpose:
 * Persist supplier performance events, scorecards, and governance proposals.
 */

import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { procurementPerformanceMeasures } from "@/db/seeds/procurement-catalogues";
import { getDb } from "@/db/client";
import {
  procurementGovernanceProposal,
  procurementPerformanceControl,
  procurementPerformanceEvaluation,
  procurementPerformanceEvaluationRating,
  procurementPerformanceEvent,
  procurementPerformanceMeasure,
  procurementScorecardMeasure,
  procurementSupplierScorecard,
} from "@/db/schema/procurement-performance";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { PerformanceControlPort, PerformanceStorePort } from "@/modules/procurement/ports";
import type {
  GovernanceProposalRecord,
  PerformanceControlRecord,
  PerformanceEvaluationRatingInput,
  PerformanceEvaluationRecord,
  PerformanceEventRecord,
  PerformanceMeasureRecord,
  ScorecardMeasureView,
  SupplierScorecardView,
  UpdatePerformanceControlCommand,
} from "@/modules/procurement/types";

function mapEvent(row: typeof procurementPerformanceEvent.$inferSelect): PerformanceEventRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    profileId: row.profileId,
    measureCode: row.measureCode,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceKey: row.sourceKey,
    eventCount: row.eventCount,
    eventValue: row.eventValue,
    occurredAt: row.occurredAt,
    createdAt: row.createdAt,
  };
}

function mapMeasure(row: typeof procurementPerformanceMeasure.$inferSelect): PerformanceMeasureRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    code: row.code,
    name: row.name,
    description: row.description,
    dimension: row.dimension,
    weight: row.weight,
    higherIsBetter: row.higherIsBetter,
    displayOrder: row.displayOrder,
    isActive: row.isActive,
  };
}

function mapProposal(
  row: typeof procurementGovernanceProposal.$inferSelect
): GovernanceProposalRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    profileId: row.profileId,
    proposalType: row.proposalType,
    status: row.status,
    reason: row.reason,
    authority: row.authority,
    evidenceDocumentId: row.evidenceDocumentId,
    effectiveDate: row.effectiveDate,
    reviewDate: row.reviewDate,
    scorecardId: row.scorecardId,
    proposedBy: row.proposedBy,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    rejectedAt: row.rejectedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PerformanceRepository implements PerformanceStorePort {
  constructor(private readonly db = getDb()) {}

  insertEvent = async (
    values: Omit<PerformanceEventRecord, "id" | "createdAt">
  ) => {
    const [existing] = await this.db
      .select()
      .from(procurementPerformanceEvent)
      .where(
        and(
          eq(procurementPerformanceEvent.businessId, values.businessId),
          eq(procurementPerformanceEvent.sourceKey, values.sourceKey)
        )
      )
      .limit(1);
    if (existing) {
      return mapEvent(existing);
    }
    const [row] = await this.db
      .insert(procurementPerformanceEvent)
      .values({
        id: randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        measureCode: values.measureCode,
        sourceType: values.sourceType,
        sourceId: values.sourceId,
        sourceKey: values.sourceKey,
        eventCount: values.eventCount,
        eventValue: values.eventValue,
        occurredAt: values.occurredAt,
      })
      .returning();
    return mapEvent(row!);
  };

  listEventsByProfile = async (businessId: string, profileId: string, from: Date, to: Date) => {
    const rows = await this.db
      .select()
      .from(procurementPerformanceEvent)
      .where(
        and(
          eq(procurementPerformanceEvent.businessId, businessId),
          eq(procurementPerformanceEvent.profileId, profileId),
          gte(procurementPerformanceEvent.occurredAt, from),
          lte(procurementPerformanceEvent.occurredAt, to)
        )
      );
    return rows.map(mapEvent);
  };

  listMeasures = async (businessId: string) => {
    const rows = await this.db
      .select()
      .from(procurementPerformanceMeasure)
      .where(eq(procurementPerformanceMeasure.businessId, businessId));
    if (rows.length > 0) {
      return rows.map(mapMeasure);
    }
    const seeded = await Promise.all(
      procurementPerformanceMeasures.map((item) =>
        this.insertMeasure({
          businessId,
          code: item.code,
          name: item.name,
          description: item.description,
          dimension: item.dimension,
          weight: item.weight,
          higherIsBetter: item.higherIsBetter,
          displayOrder: item.displayOrder,
          isActive: item.isActive,
        })
      )
    );
    return seeded;
  };

  private insertMeasure = async (values: Omit<PerformanceMeasureRecord, "id">) => {
    const [row] = await this.db
      .insert(procurementPerformanceMeasure)
      .values({
        id: randomUUID(),
        businessId: values.businessId,
        code: values.code,
        name: values.name,
        description: values.description,
        dimension: values.dimension,
        weight: values.weight,
        higherIsBetter: values.higherIsBetter,
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      })
      .returning();
    return mapMeasure(row!);
  };

  upsertScorecard = async (values: {
    id?: string;
    businessId: string;
    profileId: string;
    periodStart: string;
    periodEnd: string;
    compositeScore: string;
    status: string;
    computedAt?: string;
    measures: ScorecardMeasureView[];
  }): Promise<SupplierScorecardView> => {
    const scorecardId = values.id ?? randomUUID();
    const [existing] = await this.db
      .select({ id: procurementSupplierScorecard.id })
      .from(procurementSupplierScorecard)
      .where(
        and(
          eq(procurementSupplierScorecard.businessId, values.businessId),
          eq(procurementSupplierScorecard.profileId, values.profileId),
          eq(procurementSupplierScorecard.periodStart, values.periodStart),
          eq(procurementSupplierScorecard.periodEnd, values.periodEnd)
        )
      )
      .limit(1);
    const targetId = existing?.id ?? scorecardId;
    if (existing) {
      await this.db
        .update(procurementSupplierScorecard)
        .set({
          compositeScore: values.compositeScore,
          status: values.status,
          computedAt: values.computedAt ? new Date(values.computedAt) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(procurementSupplierScorecard.id, targetId));
      await this.db
        .delete(procurementScorecardMeasure)
        .where(eq(procurementScorecardMeasure.scorecardId, targetId));
    } else {
      await this.db.insert(procurementSupplierScorecard).values({
        id: targetId,
        businessId: values.businessId,
        profileId: values.profileId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        compositeScore: values.compositeScore,
        status: values.status,
        computedAt: values.computedAt ? new Date(values.computedAt) : new Date(),
      });
    }
    if (values.measures.length > 0) {
      await this.db.insert(procurementScorecardMeasure).values(
        values.measures.map((measure) => ({
          id: randomUUID(),
          businessId: values.businessId,
          scorecardId: targetId,
          measureCode: measure.measureCode,
          eventCount: measure.eventCount,
          eventTotal: measure.eventTotal,
          score: measure.score,
          weight: measure.weight,
          weightedScore: measure.weightedScore,
        }))
      );
    }
    const view = await this.findScorecardById(values.businessId, targetId);
    if (!view) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SCORECARD_NOT_FOUND, undefined, 404);
    }
    return view;
  };

  findLatestScorecard = async (businessId: string, profileId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementSupplierScorecard)
      .where(
        and(
          eq(procurementSupplierScorecard.businessId, businessId),
          eq(procurementSupplierScorecard.profileId, profileId)
        )
      )
      .orderBy(desc(procurementSupplierScorecard.computedAt))
      .limit(1);
    if (!row) {
      return null;
    }
    return this.findScorecardById(businessId, row.id);
  };

  findScorecardById = async (businessId: string, scorecardId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementSupplierScorecard)
      .where(
        and(
          eq(procurementSupplierScorecard.id, scorecardId),
          eq(procurementSupplierScorecard.businessId, businessId)
        )
      )
      .limit(1);
    if (!row) {
      return null;
    }
    const measureRows = await this.db
      .select()
      .from(procurementScorecardMeasure)
      .where(eq(procurementScorecardMeasure.scorecardId, scorecardId));
    const catalogue = await this.listMeasures(businessId);
    const names = new Map(catalogue.map((item) => [item.code, item.name]));
    return {
      id: row.id,
      profileId: row.profileId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      compositeScore: row.compositeScore,
      status: row.status,
      computedAt: row.computedAt.toISOString(),
      measures: measureRows.map((measure) => ({
        measureCode: measure.measureCode,
        measureName: names.get(measure.measureCode) ?? measure.measureCode,
        dimension: catalogue.find((item) => item.code === measure.measureCode)?.dimension ?? "",
        eventCount: measure.eventCount,
        eventTotal: measure.eventTotal,
        score: measure.score,
        weight: measure.weight,
        weightedScore: measure.weightedScore,
      })),
    } satisfies SupplierScorecardView;
  };

  insertProposal = async (
    values: Omit<
      GovernanceProposalRecord,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "approvedBy"
      | "approvedAt"
      | "rejectedAt"
      | "rejectionReason"
    >
  ) => {
    const [row] = await this.db
      .insert(procurementGovernanceProposal)
      .values({
        id: randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        proposalType: values.proposalType,
        status: values.status,
        reason: values.reason,
        authority: values.authority,
        evidenceDocumentId: values.evidenceDocumentId,
        effectiveDate: values.effectiveDate,
        reviewDate: values.reviewDate,
        scorecardId: values.scorecardId,
        proposedBy: values.proposedBy,
      })
      .returning();
    return mapProposal(row!);
  };

  updateProposal = async (
    businessId: string,
    proposalId: string,
    patch: Partial<GovernanceProposalRecord>
  ) => {
    const [row] = await this.db
      .update(procurementGovernanceProposal)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(procurementGovernanceProposal.id, proposalId),
          eq(procurementGovernanceProposal.businessId, businessId)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_NOT_FOUND, undefined, 404);
    }
    return mapProposal(row);
  };

  findProposalById = async (businessId: string, proposalId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementGovernanceProposal)
      .where(
        and(
          eq(procurementGovernanceProposal.id, proposalId),
          eq(procurementGovernanceProposal.businessId, businessId)
        )
      )
      .limit(1);
    return row ? mapProposal(row) : null;
  };

  listPendingProposals = async (businessId: string, profileId: string) => {
    const rows = await this.db
      .select()
      .from(procurementGovernanceProposal)
      .where(
        and(
          eq(procurementGovernanceProposal.businessId, businessId),
          eq(procurementGovernanceProposal.profileId, profileId),
          eq(procurementGovernanceProposal.status, "PENDING")
        )
      );
    return rows.map(mapProposal);
  };

  listEvaluationsByProfile = async (
    businessId: string,
    profileId: string,
    periodStart: string,
    periodEnd: string
  ) => {
    const rows = await this.db
      .select()
      .from(procurementPerformanceEvaluation)
      .where(
        and(
          eq(procurementPerformanceEvaluation.businessId, businessId),
          eq(procurementPerformanceEvaluation.profileId, profileId),
          eq(procurementPerformanceEvaluation.periodStart, periodStart),
          eq(procurementPerformanceEvaluation.periodEnd, periodEnd)
        )
      );
    return Promise.all(rows.map((row) => this.mapEvaluation(row)));
  };

  upsertEvaluationDraft = async (values: {
    businessId: string;
    profileId: string;
    periodStart: string;
    periodEnd: string;
    evaluatorType: string;
    evaluatorUserId: string | null;
    evaluatorLabel: string | null;
  }) => {
    const matchConditions = [
      eq(procurementPerformanceEvaluation.businessId, values.businessId),
      eq(procurementPerformanceEvaluation.profileId, values.profileId),
      eq(procurementPerformanceEvaluation.periodStart, values.periodStart),
      eq(procurementPerformanceEvaluation.periodEnd, values.periodEnd),
      eq(procurementPerformanceEvaluation.evaluatorType, values.evaluatorType),
    ];
    if (values.evaluatorUserId) {
      matchConditions.push(
        eq(procurementPerformanceEvaluation.evaluatorUserId, values.evaluatorUserId)
      );
    } else {
      matchConditions.push(isNull(procurementPerformanceEvaluation.evaluatorUserId));
    }
    const [existing] = await this.db
      .select()
      .from(procurementPerformanceEvaluation)
      .where(and(...matchConditions))
      .limit(1);
    if (existing) {
      return this.mapEvaluation(existing);
    }
    const [row] = await this.db
      .insert(procurementPerformanceEvaluation)
      .values({
        id: randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        evaluatorType: values.evaluatorType,
        evaluatorUserId: values.evaluatorUserId,
        evaluatorLabel: values.evaluatorLabel,
        status: "DRAFT",
      })
      .returning();
    return this.mapEvaluation(row!);
  };

  submitEvaluation = async (
    businessId: string,
    evaluationId: string,
    ratings: PerformanceEvaluationRatingInput[],
    compositeScore: string
  ) => {
    const [row] = await this.db
      .update(procurementPerformanceEvaluation)
      .set({
        status: "SUBMITTED",
        compositeScore,
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(procurementPerformanceEvaluation.id, evaluationId),
          eq(procurementPerformanceEvaluation.businessId, businessId)
        )
      )
      .returning();
    if (!row) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_NOT_FOUND, undefined, 404);
    }
    await this.db
      .delete(procurementPerformanceEvaluationRating)
      .where(eq(procurementPerformanceEvaluationRating.evaluationId, evaluationId));
    if (ratings.length > 0) {
      await this.db.insert(procurementPerformanceEvaluationRating).values(
        ratings.map((rating) => ({
          id: randomUUID(),
          businessId,
          evaluationId,
          measureCode: rating.measureCode,
          score: rating.score.toFixed(2),
        }))
      );
    }
    return this.mapEvaluation(row);
  };

  findEvaluationById = async (businessId: string, evaluationId: string) => {
    const [row] = await this.db
      .select()
      .from(procurementPerformanceEvaluation)
      .where(
        and(
          eq(procurementPerformanceEvaluation.id, evaluationId),
          eq(procurementPerformanceEvaluation.businessId, businessId)
        )
      )
      .limit(1);
    return row ? this.mapEvaluation(row) : null;
  };

  private async mapEvaluation(
    row: typeof procurementPerformanceEvaluation.$inferSelect
  ): Promise<PerformanceEvaluationRecord> {
    const ratingRows = await this.db
      .select()
      .from(procurementPerformanceEvaluationRating)
      .where(eq(procurementPerformanceEvaluationRating.evaluationId, row.id));
    return {
      id: row.id,
      businessId: row.businessId,
      profileId: row.profileId,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      evaluatorType: row.evaluatorType,
      evaluatorUserId: row.evaluatorUserId,
      evaluatorLabel: row.evaluatorLabel,
      status: row.status,
      compositeScore: row.compositeScore,
      submittedAt: row.submittedAt,
      ratings: ratingRows.map((rating) => ({
        measureCode: rating.measureCode,
        score: Number(rating.score),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  };
}

export class PerformanceControlRepository implements PerformanceControlPort {
  constructor(private readonly db = getDb()) {}

  async getControl(businessId: string) {
    const [row] = await this.db
      .select()
      .from(procurementPerformanceControl)
      .where(eq(procurementPerformanceControl.businessId, businessId))
      .limit(1);
    if (!row) {
      return null;
    }
    return mapControl(row);
  }

  async getOrCreateControl(businessId: string) {
    const existing = await this.getControl(businessId);
    if (existing) {
      return existing;
    }
    const [row] = await this.db
      .insert(procurementPerformanceControl)
      .values({
        id: randomUUID(),
        businessId,
      })
      .returning();
    return mapControl(row!);
  }

  async updateControl(businessId: string, patch: UpdatePerformanceControlCommand) {
    await this.getOrCreateControl(businessId);
    const [row] = await this.db
      .update(procurementPerformanceControl)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(procurementPerformanceControl.businessId, businessId))
      .returning();
    return mapControl(row!);
  }
}

function mapControl(row: typeof procurementPerformanceControl.$inferSelect): PerformanceControlRecord {
  return {
    businessId: row.businessId,
    defaultPeriodDays: row.defaultPeriodDays,
    preferredScoreThreshold: row.preferredScoreThreshold,
    preferredRequiresApproval: row.preferredRequiresApproval,
    blockBlacklistedTransactions: row.blockBlacklistedTransactions,
    supplierSelfEvalRequired: row.supplierSelfEvalRequired,
    includeSupplierSelfEvalInAverage: row.includeSupplierSelfEvalInAverage,
  };
}

export function createPerformanceRepository() {
  return new PerformanceRepository();
}

export function createPerformanceControlRepository() {
  return new PerformanceControlRepository();
}
