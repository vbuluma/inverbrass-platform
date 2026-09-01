/**
 * Purpose:
 * Orchestrate BP-009 IP-11 supplier performance, scorecards, and governance.
 * Does not create a second supplier master or auto-award sourcing events.
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  GOVERNANCE_PROPOSAL_STATUSES,
  GOVERNANCE_PROPOSAL_TYPES,
  PERFORMANCE_EVALUATION_STATUSES,
  PERFORMANCE_EVALUATOR_TYPES,
  PERFORMANCE_MEASURE_CODES,
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  PROCUREMENT_STATUS_CODES,
  SCORECARD_STATUSES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  PerformanceControlPort,
  PerformanceStorePort,
  ProcurementAuditPort,
  ProcurementPerformanceBridgePort,
  ProcurementProfileRepositoryPort,
} from "@/modules/procurement/ports";
import {
  createPerformanceControlRepository,
  createPerformanceRepository,
} from "@/modules/procurement/repositories/performance-repository";
import { createProcurementProfileRepository } from "@/modules/procurement/repositories/procurement-profile-repository";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import {
  assertEvaluationScores,
  assertSupplierSelfEvalRequired,
  blendMeasureScore,
  buildEvaluationSummary,
  computeEvaluationComposite,
} from "@/modules/procurement/services/performance-evaluation-rules";
import {
  assertGovernanceEvidence,
  compareInvitationRank,
  computeCompositeScore,
  computeMeasureScore,
  governanceTargetStatus,
  preferredThresholdMet,
} from "@/modules/procurement/services/performance-rules";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import type {
  GovernanceProposalRecord,
  PerformanceControlRecord,
  PerformanceEvaluationRecord,
  PerformanceMeasureRecord,
  ProposeGovernanceCommand,
  ProcurementActor,
  RecordPerformanceEventCommand,
  SubmitPerformanceEvaluationCommand,
  SupplierPerformanceRanking,
  SupplierProfilePerformanceView,
  SupplierScorecardView,
  UpdatePerformanceControlCommand,
} from "@/modules/procurement/types";

export type PerformanceServiceDependencies = {
  store: PerformanceStorePort;
  controls: PerformanceControlPort;
  profiles: ProcurementProfileRepositoryPort;
  audit: ProcurementAuditPort;
};

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function requireProfile<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
  }
  return row;
}

export class PerformanceService {
  constructor(private readonly deps: PerformanceServiceDependencies) {}

  async recordEvent(input: RecordPerformanceEventCommand) {
    await this.deps.store.insertEvent({
      businessId: input.businessId,
      profileId: input.profileId,
      measureCode: input.measureCode,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceKey: input.sourceKey,
      eventCount: input.eventCount ?? 1,
      eventValue: input.eventValue ?? "1",
      occurredAt: input.occurredAt ?? new Date(),
    });
    await this.deps.audit.record({
      businessId: input.businessId,
      actorUserId: input.actorUserId ?? null,
      entityId: input.profileId,
      action: PROCUREMENT_AUDIT_ACTIONS.PERFORMANCE_EVENT_RECORDED,
      outcome: "SUCCESS",
      references: {
        measureCode: input.measureCode,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });
  }

  async refreshScorecard(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string
  ): Promise<SupplierScorecardView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PERFORMANCE_MANAGE);
    requireProfile(await this.deps.profiles.findById(context.businessId, profileId));
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const measures = (await this.deps.store.listMeasures(context.businessId)).filter(
      (row) => row.isActive
    );
    const { periodStart, periodEnd, periodStartDate, periodEndDate } =
      this.resolvePeriodBounds(control);
    const events = await this.deps.store.listEventsByProfile(
      context.businessId,
      profileId,
      periodStartDate,
      periodEndDate
    );
    const evaluations = await this.deps.store.listEvaluationsByProfile(
      context.businessId,
      profileId,
      periodStart,
      periodEnd
    );
    assertSupplierSelfEvalRequired({
      supplierSelfEvalRequired: control.supplierSelfEvalRequired,
      evaluations,
    });
    const evaluationSummary = buildEvaluationSummary({
      evaluations,
      includeSupplierSelfEvalInAverage: control.includeSupplierSelfEvalInAverage,
      measures,
    });
    const measureViews = measures.map((measure) => {
      const transactional = this.buildMeasureView(measure, events);
      const evaluationScore = evaluationSummary.averagedByMeasure.get(measure.code) ?? null;
      const blendedScore = blendMeasureScore(Number(transactional.score), evaluationScore);
      const weight = Number(measure.weight);
      return {
        ...transactional,
        score: blendedScore.toFixed(2),
        weightedScore: (blendedScore * weight).toFixed(4),
      };
    });
    const compositeScore = computeCompositeScore(
      measureViews.map((row) => ({
        score: Number(row.score),
        weight: Number(row.weight),
      }))
    );
    const scorecard = await this.deps.store.upsertScorecard({
      businessId: context.businessId,
      profileId,
      periodStart,
      periodEnd,
      compositeScore,
      status: SCORECARD_STATUSES.PUBLISHED,
      measures: measureViews,
    });
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId: scorecard.id,
      action: PROCUREMENT_AUDIT_ACTIONS.SCORECARD_COMPUTED,
      outcome: "SUCCESS",
      references: { compositeScore },
    });
    return {
      ...scorecard,
      evaluationSummary: {
        internalEvaluatorCount: evaluationSummary.internalEvaluatorCount,
        internalAverageComposite: evaluationSummary.internalAverageComposite,
        supplierEvaluationSubmitted: evaluationSummary.supplierEvaluationSubmitted,
        supplierCompositeScore: evaluationSummary.supplierCompositeScore,
        supplierIncludedInAverage: evaluationSummary.supplierIncludedInAverage,
        blendedEvaluatorCount: evaluationSummary.blendedEvaluatorCount,
      },
    };
  }

  async submitInternalEvaluation(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    input: SubmitPerformanceEvaluationCommand
  ): Promise<PerformanceEvaluationRecord> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PERFORMANCE_MANAGE);
    requireProfile(await this.deps.profiles.findById(context.businessId, profileId));
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const measures = (await this.deps.store.listMeasures(context.businessId)).filter(
      (row) => row.isActive
    );
    assertEvaluationScores(input.ratings, measures);
    const { periodStart, periodEnd } = this.resolvePeriodBounds(control);
    const draft = await this.deps.store.upsertEvaluationDraft({
      businessId: context.businessId,
      profileId,
      periodStart,
      periodEnd,
      evaluatorType: PERFORMANCE_EVALUATOR_TYPES.INTERNAL,
      evaluatorUserId: actor.userId,
      evaluatorLabel: input.evaluatorLabel?.trim() || "Internal evaluator",
    });
    if (draft.status === PERFORMANCE_EVALUATION_STATUSES.SUBMITTED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_ALREADY_SUBMITTED, undefined, 409);
    }
    const compositeScore = computeEvaluationComposite(input.ratings, measures);
    const submitted = await this.deps.store.submitEvaluation(
      context.businessId,
      draft.id,
      input.ratings,
      compositeScore
    );
    await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.EVALUATION_SUBMITTED, {
      evaluationId: submitted.id,
      evaluatorType: PERFORMANCE_EVALUATOR_TYPES.INTERNAL,
    });
    return submitted;
  }

  async submitSupplierSelfEvaluation(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    input: SubmitPerformanceEvaluationCommand
  ): Promise<PerformanceEvaluationRecord> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PERFORMANCE_MANAGE);
    requireProfile(await this.deps.profiles.findById(context.businessId, profileId));
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const measures = (await this.deps.store.listMeasures(context.businessId)).filter(
      (row) => row.isActive
    );
    assertEvaluationScores(input.ratings, measures);
    const { periodStart, periodEnd } = this.resolvePeriodBounds(control);
    const draft = await this.deps.store.upsertEvaluationDraft({
      businessId: context.businessId,
      profileId,
      periodStart,
      periodEnd,
      evaluatorType: PERFORMANCE_EVALUATOR_TYPES.SUPPLIER,
      evaluatorUserId: null,
      evaluatorLabel: input.evaluatorLabel?.trim() || "Supplier self-review",
    });
    if (draft.status === PERFORMANCE_EVALUATION_STATUSES.SUBMITTED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_ALREADY_SUBMITTED, undefined, 409);
    }
    const compositeScore = computeEvaluationComposite(input.ratings, measures);
    const submitted = await this.deps.store.submitEvaluation(
      context.businessId,
      draft.id,
      input.ratings,
      compositeScore
    );
    await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.EVALUATION_SUBMITTED, {
      evaluationId: submitted.id,
      evaluatorType: PERFORMANCE_EVALUATOR_TYPES.SUPPLIER,
    });
    return submitted;
  }

  async updatePerformanceControl(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: UpdatePerformanceControlCommand
  ): Promise<PerformanceControlRecord> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PERFORMANCE_MANAGE);
    const updated = await this.deps.controls.updateControl(context.businessId, input);
    await this.audit(context, context.businessId, PROCUREMENT_AUDIT_ACTIONS.PERFORMANCE_CONTROL_UPDATED);
    return updated;
  }

  async getLatestScorecard(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string
  ): Promise<SupplierScorecardView | null> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PERFORMANCE_READ);
    return this.deps.store.findLatestScorecard(context.businessId, profileId);
  }

  async getProfilePerformance(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string
  ): Promise<SupplierProfilePerformanceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.PERFORMANCE_READ);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    const { periodStart, periodEnd } = this.resolvePeriodBounds(control);
    const [scorecard, pendingProposals, evaluations] = await Promise.all([
      this.deps.store.findLatestScorecard(context.businessId, profileId),
      this.deps.store.listPendingProposals(context.businessId, profileId),
      this.deps.store.listEvaluationsByProfile(
        context.businessId,
        profileId,
        periodStart,
        periodEnd
      ),
    ]);
    const supplierSubmitted = evaluations.some(
      (row) =>
        row.evaluatorType === PERFORMANCE_EVALUATOR_TYPES.SUPPLIER &&
        row.status === PERFORMANCE_EVALUATION_STATUSES.SUBMITTED
    );
    return {
      scorecard,
      pendingProposals,
      evaluations,
      control,
      pendingSupplierSelfEval: control.supplierSelfEvalRequired && !supplierSubmitted,
      canSubmitEvaluation: actor.permissions.includes(PROCUREMENT_PERMISSIONS.PERFORMANCE_MANAGE),
      canManagePerformance: actor.permissions.includes(PROCUREMENT_PERMISSIONS.PERFORMANCE_MANAGE),
      canProposeGovernance: actor.permissions.includes(PROCUREMENT_PERMISSIONS.GOVERNANCE_PROPOSE),
      canApproveGovernance: actor.permissions.includes(PROCUREMENT_PERMISSIONS.GOVERNANCE_APPROVE),
    };
  }

  async proposeGovernance(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    profileId: string,
    input: ProposeGovernanceCommand
  ): Promise<GovernanceProposalRecord> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.GOVERNANCE_PROPOSE);
    const profile = requireProfile(await this.deps.profiles.findById(context.businessId, profileId));
    assertGovernanceEvidence(input);
    const control = await this.deps.controls.getOrCreateControl(context.businessId);
    let scorecardId: string | null = null;
    if (input.proposalType === GOVERNANCE_PROPOSAL_TYPES.GRANT_PREFERRED) {
      const scorecard =
        (await this.deps.store.findLatestScorecard(context.businessId, profileId)) ??
        (await this.refreshScorecard(context, actor, profileId));
      if (!preferredThresholdMet(scorecard.compositeScore, control.preferredScoreThreshold)) {
        throw new ProcurementError(
          PROCUREMENT_ERROR_CODES.PREFERRED_THRESHOLD_NOT_MET,
          undefined,
          409
        );
      }
      scorecardId = scorecard.id;
      if (!control.preferredRequiresApproval && profile.statusCode === PROCUREMENT_STATUS_CODES.ACTIVE) {
        await this.deps.profiles.update(context.businessId, profileId, {
          isPreferred: true,
          updatedBy: actorId(context),
          version: profile.version + 1,
        });
        await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.PREFERRED_GRANTED);
        return this.deps.store.insertProposal({
          businessId: context.businessId,
          profileId,
          proposalType: input.proposalType,
          status: GOVERNANCE_PROPOSAL_STATUSES.APPROVED,
          reason: input.reason.trim(),
          authority: input.authority?.trim() || null,
          evidenceDocumentId: input.evidenceDocumentId?.trim() || null,
          effectiveDate: input.effectiveDate ?? null,
          reviewDate: input.reviewDate ?? null,
          scorecardId,
          proposedBy: actorId(context),
        });
      }
    }
    const proposal = await this.deps.store.insertProposal({
      businessId: context.businessId,
      profileId,
      proposalType: input.proposalType,
      status: GOVERNANCE_PROPOSAL_STATUSES.PENDING,
      reason: input.reason.trim(),
      authority: input.authority?.trim() || null,
      evidenceDocumentId: input.evidenceDocumentId?.trim() || null,
      effectiveDate: input.effectiveDate ?? null,
      reviewDate: input.reviewDate ?? null,
      scorecardId,
      proposedBy: actorId(context),
    });
    await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.GOVERNANCE_PROPOSED, {
      proposalId: proposal.id,
      proposalType: input.proposalType,
    });
    return proposal;
  }

  async approveGovernance(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    proposalId: string
  ): Promise<GovernanceProposalRecord> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.GOVERNANCE_APPROVE);
    const proposal = requireProposal(
      await this.deps.store.findProposalById(context.businessId, proposalId)
    );
    if (proposal.status !== GOVERNANCE_PROPOSAL_STATUSES.PENDING) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_NOT_PENDING, undefined, 409);
    }
    const profile = requireProfile(
      await this.deps.profiles.findById(context.businessId, proposal.profileId)
    );
    await this.applyProposal(context, profile.id, profile.version, proposal);
    const updated = await this.deps.store.updateProposal(context.businessId, proposalId, {
      status: GOVERNANCE_PROPOSAL_STATUSES.APPROVED,
      approvedBy: actorId(context),
      approvedAt: new Date(),
    });
    await this.audit(context, proposal.profileId, PROCUREMENT_AUDIT_ACTIONS.GOVERNANCE_APPROVED, {
      proposalId,
    });
    return updated;
  }

  async rejectGovernance(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    proposalId: string,
    reason?: string | null
  ): Promise<GovernanceProposalRecord> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.GOVERNANCE_APPROVE);
    const proposal = requireProposal(
      await this.deps.store.findProposalById(context.businessId, proposalId)
    );
    if (proposal.status !== GOVERNANCE_PROPOSAL_STATUSES.PENDING) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_NOT_PENDING, undefined, 409);
    }
    const updated = await this.deps.store.updateProposal(context.businessId, proposalId, {
      status: GOVERNANCE_PROPOSAL_STATUSES.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason?.trim() || null,
    });
    await this.audit(context, proposal.profileId, PROCUREMENT_AUDIT_ACTIONS.GOVERNANCE_REJECTED, {
      proposalId,
    });
    return updated;
  }

  async rankSuppliers(
    context: CurrentBusinessContext,
    profileIds: string[],
    preferredByProfile: Record<string, boolean>
  ): Promise<SupplierPerformanceRanking[]> {
    const rows: SupplierPerformanceRanking[] = [];
    for (const profileId of profileIds) {
      const scorecard = await this.deps.store.findLatestScorecard(context.businessId, profileId);
      rows.push({
        profileId,
        compositeScore: scorecard?.compositeScore ?? null,
        isPreferred: preferredByProfile[profileId] ?? false,
        invitationRank: 0,
      });
    }
    rows.sort(compareInvitationRank);
    return rows.map((row, index) => ({ ...row, invitationRank: index + 1 }));
  }

  private resolvePeriodBounds(control: PerformanceControlRecord) {
    const periodEndDate = new Date();
    const periodStartDate = new Date();
    periodStartDate.setDate(periodStartDate.getDate() - control.defaultPeriodDays);
    return {
      periodStart: periodStartDate.toISOString().slice(0, 10),
      periodEnd: periodEndDate.toISOString().slice(0, 10),
      periodStartDate,
      periodEndDate,
    };
  }

  private buildMeasureView(
    measure: PerformanceMeasureRecord,
    events: Awaited<ReturnType<PerformanceStorePort["listEventsByProfile"]>>
  ) {
    const related = events.filter((row) => row.measureCode === measure.code);
    const eventCount = related.reduce((sum, row) => sum + row.eventCount, 0);
    const eventTotal = related
      .reduce((sum, row) => sum + Number(row.eventValue), 0)
      .toFixed(4);
    const onTime = events
      .filter((row) => row.measureCode === PERFORMANCE_MEASURE_CODES.DELIVERY_ON_TIME)
      .reduce((sum, row) => sum + row.eventCount, 0);
    const late = events
      .filter((row) => row.measureCode === PERFORMANCE_MEASURE_CODES.DELIVERY_LATE)
      .reduce((sum, row) => sum + row.eventCount, 0);
    const score = computeMeasureScore({
      measure,
      eventCount,
      pairedOnTime: onTime,
      pairedLate: late,
    });
    const weight = Number(measure.weight);
    return {
      measureCode: measure.code,
      measureName: measure.name,
      dimension: measure.dimension,
      eventCount,
      eventTotal,
      score: score.toFixed(2),
      weight: measure.weight,
      weightedScore: (score * weight).toFixed(4),
    };
  }

  private async applyProposal(
    context: CurrentBusinessContext,
    profileId: string,
    version: number,
    proposal: GovernanceProposalRecord
  ) {
    const patch: Parameters<ProcurementProfileRepositoryPort["update"]>[2] = {
      updatedBy: actorId(context),
      version: version + 1,
    };
    if (proposal.proposalType === GOVERNANCE_PROPOSAL_TYPES.GRANT_PREFERRED) {
      patch.isPreferred = true;
      await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.PREFERRED_GRANTED);
    } else if (proposal.proposalType === GOVERNANCE_PROPOSAL_TYPES.REVOKE_PREFERRED) {
      patch.isPreferred = false;
      await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.PREFERRED_REVOKED);
    } else {
      const status = governanceTargetStatus(proposal.proposalType);
      if (status) {
        patch.statusCode = status;
        patch.statusReason = proposal.reason;
        patch.statusAuthority = proposal.authority;
        patch.statusEffectiveDate = proposal.effectiveDate;
        patch.statusReviewDate = proposal.reviewDate;
        if (status === PROCUREMENT_STATUS_CODES.BLACKLISTED) {
          patch.isPreferred = false;
          await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_BLACKLISTED);
        } else if (status === PROCUREMENT_STATUS_CODES.SUSPENDED) {
          patch.isPreferred = false;
          await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_SUSPENDED);
        } else if (status === PROCUREMENT_STATUS_CODES.ACTIVE) {
          await this.audit(context, profileId, PROCUREMENT_AUDIT_ACTIONS.SUPPLIER_REACTIVATED);
        }
      }
    }
    await this.deps.profiles.update(context.businessId, profileId, patch);
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references?: Record<string, string>
  ) {
    await this.deps.audit.record({
      businessId: context.businessId,
      actorUserId: actorId(context),
      entityId,
      action,
      outcome: "SUCCESS",
      references,
    });
  }
}

function requireProposal<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.GOVERNANCE_NOT_FOUND, undefined, 404);
  }
  return row;
}

export function createDefaultPerformanceDependencies(): PerformanceServiceDependencies {
  return {
    store: createPerformanceRepository(),
    controls: createPerformanceControlRepository(),
    profiles: createProcurementProfileRepository(),
    audit: createProcurementAuditAdapter(),
  };
}

export function createPerformanceService(
  overrides: Partial<PerformanceServiceDependencies> = {}
): PerformanceService {
  return new PerformanceService({ ...createDefaultPerformanceDependencies(), ...overrides });
}

export function createProcurementPerformanceBridge(
  service: PerformanceService = createPerformanceService()
): ProcurementPerformanceBridgePort {
  return {
    recordEvent: async (input) => {
      await service.recordEvent(input);
    },
  };
}
