/**
 * Purpose:
 * In-memory performance store for IP-11 certification. Not production runtime.
 */

import { randomUUID } from "node:crypto";

import { procurementPerformanceMeasures } from "@/db/seeds/procurement-catalogues";
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

export class InMemoryPerformanceStore {
  events = new Map<string, PerformanceEventRecord>();
  measuresByBusiness = new Map<string, PerformanceMeasureRecord[]>();
  scorecards = new Map<string, SupplierScorecardView & { businessId: string }>();
  scorecardMeasures = new Map<string, ScorecardMeasureView[]>();
  proposals = new Map<string, GovernanceProposalRecord>();
  evaluations = new Map<string, PerformanceEvaluationRecord>();
  controlByBusiness = new Map<string, PerformanceControlRecord>();

  controls: PerformanceControlPort = {
    getControl: async (businessId) => this.controlByBusiness.get(businessId) ?? null,
    getOrCreateControl: async (businessId) => {
      const existing = this.controlByBusiness.get(businessId);
      if (existing) {
        return existing;
      }
      const created: PerformanceControlRecord = {
        businessId,
        defaultPeriodDays: 90,
        preferredScoreThreshold: "75",
        preferredRequiresApproval: true,
        blockBlacklistedTransactions: true,
        supplierSelfEvalRequired: true,
        includeSupplierSelfEvalInAverage: false,
      };
      this.controlByBusiness.set(businessId, created);
      return created;
    },
    updateControl: async (businessId, patch) => {
      const current = await this.controls.getOrCreateControl(businessId);
      const updated = { ...current, ...patch };
      this.controlByBusiness.set(businessId, updated);
      return updated;
    },
  };

  async ensureMeasures(businessId: string) {
    const existing = this.measuresByBusiness.get(businessId);
    if (existing?.length) {
      return existing;
    }
    const rows = procurementPerformanceMeasures.map((row) => ({
      id: randomUUID(),
      businessId,
      code: row.code,
      name: row.name,
      description: row.description,
      dimension: row.dimension,
      weight: row.weight,
      higherIsBetter: row.higherIsBetter,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    }));
    this.measuresByBusiness.set(businessId, rows);
    return rows;
  }

  store: PerformanceStorePort = {
    insertEvent: async (values) => {
      const existing = [...this.events.values()].find(
        (row) => row.businessId === values.businessId && row.sourceKey === values.sourceKey
      );
      if (existing) {
        return existing;
      }
      const row: PerformanceEventRecord = {
        id: randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        measureCode: values.measureCode,
        sourceType: values.sourceType,
        sourceId: values.sourceId,
        sourceKey: values.sourceKey,
        eventCount: values.eventCount ?? 1,
        eventValue: values.eventValue ?? "1",
        occurredAt: values.occurredAt ?? new Date(),
        createdAt: new Date(),
      };
      this.events.set(row.id, row);
      return row;
    },
    listEventsByProfile: async (businessId, profileId, from, to) =>
      [...this.events.values()].filter(
        (row) =>
          row.businessId === businessId &&
          row.profileId === profileId &&
          row.occurredAt >= from &&
          row.occurredAt <= to
      ),
    listMeasures: async (businessId) => this.ensureMeasures(businessId),
    upsertScorecard: async (values) => {
      const row = {
        id: values.id ?? randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        compositeScore: values.compositeScore,
        status: values.status,
        computedAt: values.computedAt ?? new Date().toISOString(),
        measures: values.measures,
      };
      this.scorecards.set(row.id, row);
      this.scorecardMeasures.set(row.id, values.measures);
      return {
        id: row.id,
        profileId: row.profileId,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        compositeScore: row.compositeScore,
        status: row.status,
        computedAt: row.computedAt,
        measures: row.measures,
      };
    },
    findLatestScorecard: async (businessId, profileId) => {
      const rows = [...this.scorecards.values()]
        .filter((row) => row.businessId === businessId && row.profileId === profileId)
        .sort((a, b) => b.computedAt.localeCompare(a.computedAt));
      return rows[0] ?? null;
    },
    findScorecardById: async (businessId, scorecardId) => {
      const row = this.scorecards.get(scorecardId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return row;
    },
    insertProposal: async (values) => {
      const row: GovernanceProposalRecord = {
        id: randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        proposalType: values.proposalType,
        status: values.status,
        reason: values.reason,
        authority: values.authority ?? null,
        evidenceDocumentId: values.evidenceDocumentId ?? null,
        effectiveDate: values.effectiveDate ?? null,
        reviewDate: values.reviewDate ?? null,
        scorecardId: values.scorecardId ?? null,
        proposedBy: values.proposedBy ?? null,
        approvedBy: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.proposals.set(row.id, row);
      return row;
    },
    updateProposal: async (businessId, proposalId, patch) => {
      const current = this.proposals.get(proposalId);
      if (!current || current.businessId !== businessId) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_NOT_FOUND, undefined, 404);
      }
      const updated = { ...current, ...patch, updatedAt: new Date() };
      this.proposals.set(proposalId, updated);
      return updated;
    },
    findProposalById: async (businessId, proposalId) => {
      const row = this.proposals.get(proposalId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return row;
    },
    listPendingProposals: async (businessId, profileId) =>
      [...this.proposals.values()].filter(
        (row) =>
          row.businessId === businessId &&
          row.profileId === profileId &&
          row.status === "PENDING"
      ),
    listEvaluationsByProfile: async (businessId, profileId, periodStart, periodEnd) =>
      [...this.evaluations.values()].filter(
        (row) =>
          row.businessId === businessId &&
          row.profileId === profileId &&
          row.periodStart === periodStart &&
          row.periodEnd === periodEnd
      ),
    upsertEvaluationDraft: async (values) => {
      const existing = [...this.evaluations.values()].find(
        (row) =>
          row.businessId === values.businessId &&
          row.profileId === values.profileId &&
          row.periodStart === values.periodStart &&
          row.periodEnd === values.periodEnd &&
          row.evaluatorType === values.evaluatorType &&
          row.evaluatorUserId === values.evaluatorUserId
      );
      if (existing) {
        return existing;
      }
      const row: PerformanceEvaluationRecord = {
        id: randomUUID(),
        businessId: values.businessId,
        profileId: values.profileId,
        periodStart: values.periodStart,
        periodEnd: values.periodEnd,
        evaluatorType: values.evaluatorType,
        evaluatorUserId: values.evaluatorUserId,
        evaluatorLabel: values.evaluatorLabel,
        status: "DRAFT",
        compositeScore: null,
        submittedAt: null,
        ratings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.evaluations.set(row.id, row);
      return row;
    },
    submitEvaluation: async (businessId, evaluationId, ratings, compositeScore) => {
      const current = this.evaluations.get(evaluationId);
      if (!current || current.businessId !== businessId) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_NOT_FOUND, undefined, 404);
      }
      const updated: PerformanceEvaluationRecord = {
        ...current,
        status: "SUBMITTED",
        compositeScore,
        submittedAt: new Date(),
        ratings,
        updatedAt: new Date(),
      };
      this.evaluations.set(evaluationId, updated);
      return updated;
    },
    findEvaluationById: async (businessId, evaluationId) => {
      const row = this.evaluations.get(evaluationId);
      if (!row || row.businessId !== businessId) {
        return null;
      }
      return row;
    },
  };
}

export function createInMemoryPerformanceStore() {
  return new InMemoryPerformanceStore();
}
