/**
 * Purpose:
 * Orchestrate BP-009 IP-03 sourcing events, quote versions, evaluation outcome, and awards.
 * Does not create purchase orders, contracts, receipts, invoices, or payments.
 *
 * Implementation Package:
 * BP-009 / IP-03 – Sourcing & RFX Management
 */

import { randomBytes, randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { NotificationEnginePort } from "@/core/notification-engine/ports";
import { createInProcessNotificationAdapter } from "@/core/notification-engine/adapters/in-process-notification-adapter";
import type { WorkflowEnginePort } from "@/core/workflow-engine/ports";
import { WORKFLOW_OPERATIONS } from "@/core/workflow-engine/constants";
import {
  DOCUMENT_NUMBERING_DOCUMENT_TYPES,
  DocumentNumberingError,
  type DocumentNumberingPort,
} from "@/core/localization-regulatory/document-numbering";
import { ConfigurableDocumentNumberingService } from "@/core/localization-regulatory/services/document-numbering-service";
import { createDocumentNumberingPolicyRepository } from "@/core/localization-regulatory/repositories/document-numbering-policy-repository";
import {
  addScaled,
  COMMERCIAL_DEFAULT_PRESENTATION_SCALE,
  parseMoneyToScaled,
  roundScaledToPresentation,
  scaledToString,
  type ScaledMoney,
} from "@/modules/commercial/money/commercial-money";
import {
  PROCUREMENT_AUDIT_ACTIONS,
  PROCUREMENT_PERMISSIONS,
  SOURCING_EVENT_STATUS_LABELS,
  SOURCING_EVENT_STATUSES,
  type SourcingEventStatus,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  ApprovedRequestBudgetPort,
  ProcurementAuditPort,
  SourcingStorePort,
  SuggestedSupplierPort,
} from "@/modules/procurement/ports";
import { createProcurementSourcingWorkflowAdapter } from "@/modules/procurement/adapters/procurement-sourcing-workflow-adapter";
import { createSourcingBudgetAdapter } from "@/modules/procurement/adapters/sourcing-budget-adapter";
import { createSuggestedSupplierAdapter } from "@/modules/procurement/adapters/suggested-supplier-adapter";
import { createSourcingRepository } from "@/modules/procurement/repositories/sourcing-repository";
import { createProcurementAuditAdapter } from "@/modules/procurement/services/procurement-audit-helper";
import { assertPermission, hasPermission } from "@/modules/procurement/services/procurement-rules";
import { evaluateSupplierEligibility } from "@/modules/procurement/services/supplier-eligibility-service";
import {
  computeCommercialOutcome,
  formatProcurementMoney,
  initialAndFinalFromVersions,
  labelCommercialOutcome,
} from "@/modules/procurement/services/evaluation-outcome-rules";
import {
  assertExtensionClock,
  defaultEvaluationPhases,
  EVALUATION_METHOD_LABELS,
  EVALUATION_METHODS,
  FINANCIAL_BASES,
  isBiddingOpen,
  OPENING_POLICY_LABELS,
  OPENING_POLICIES,
  RISK_LEVELS,
  resolveOpeningPolicy,
  TECHNICAL_PHASE_LABELS,
  type OpeningPolicy,
  type TechnicalPhaseCode,
  parseIsoDate,
  validateEvaluationConfig,
} from "@/modules/procurement/services/sourcing-rfx-rules";
import {
  buildAwardLinesFromQuote,
  buildSplitAwardLineDrafts,
} from "@/modules/procurement/services/award-line-rules";
import {
  buildCriteriaSnapshot,
  hashCriteriaSnapshot,
  parseCriteriaSnapshot,
} from "@/modules/procurement/services/criteria-snapshot-rules";
import {
  buildSupplierEvaluationRows,
  explainEvaluationMethodology,
  requiresAwardOverride,
} from "@/modules/procurement/services/evaluation-scoring-rules";
import {
  assertEvaluationStage,
  EVALUATION_STAGE_LABELS,
  EVALUATION_STAGES,
  isCommercialSealedToBuyer,
  isDueDiligenceComplete,
  validateCommitteeMembers,
  validateDueDiligence,
} from "@/modules/procurement/services/evaluation-workflow-rules";
import {
  activeQuoteVersions,
  computeLineTotal,
  INVITATION_RESPONSE_STATUS_LABELS,
  INVITATION_RESPONSE_STATUSES,
  QUOTE_STATUSES,
  sumLineTotals,
  validatePaymentTermsSchedule,
} from "@/modules/procurement/services/sourcing-response-rules";
import type {
  AnswerClarificationCommand,
  AskClarificationCommand,
  AwardSourcingCommand,
  ClarificationView,
  ConfigureEvaluationCriteriaCommand,
  CreateSourcingEventCommand,
  EvaluationWorkspaceView,
  ExtendTenderCommand,
  InviteSupplierCommand,
  ProcurementActor,
  OpenBidsCommand,
  RecordDueDiligenceCommand,
  RecordPhaseScoresCommand,
  SetupEvaluationCommitteeCommand,
  SourcingEventListFilter,
  SourcingEventListView,
  SourcingQuoteVersion,
  SubmitQuoteCommand,
  SupplierPortalView,
} from "@/modules/procurement/types";

export type SourcingServiceDependencies = {
  store: SourcingStorePort;
  numbering: DocumentNumberingPort;
  audit: ProcurementAuditPort;
  approvedRequests: ApprovedRequestBudgetPort;
  suggestedSupplier: SuggestedSupplierPort;
  workflow: WorkflowEnginePort;
  notifications: NotificationEnginePort;
};

const RFX_TYPES = new Set(["RFQ", "RFI", "RFP", "RFX"]);

function actorId(context: CurrentBusinessContext) {
  return context.platformUserId || null;
}

function statusLabel(status: string) {
  return SOURCING_EVENT_STATUS_LABELS[status as SourcingEventStatus] ?? status;
}

function presentAmount(amount: ScaledMoney): string {
  return scaledToString(roundScaledToPresentation(amount, COMMERCIAL_DEFAULT_PRESENTATION_SCALE));
}

function parseNonNegativeAmount(amount: string, currencyCode: string, field: string): ScaledMoney {
  try {
    const parsed = parseMoneyToScaled(amount, currencyCode);
    if (parsed.units < BigInt(0)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
    }
    return parsed;
  } catch (error) {
    if (error instanceof ProcurementError) {
      throw error;
    }
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, { field });
  }
}

function requireEvent<T>(row: T | null): T {
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
  }
  return row;
}

export class SourcingService {
  constructor(private readonly deps: SourcingServiceDependencies) {}

  async list(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    filter: SourcingEventListFilter = {}
  ): Promise<SourcingEventListView[]> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_READ);
    const events = await this.deps.store.listEvents(context.businessId);
    const views: SourcingEventListView[] = [];
    for (const event of events) {
      const budget = await this.resolveBudget(context.businessId, event.id);
      const quotes = await this.deps.store.listQuotes(event.id);
      const awards = await this.deps.store.listAwards(event.id);
      const biddingOpen = isBiddingOpen({
        status: event.status,
        closesAt: event.closesAt,
      });
      views.push({
        id: event.id,
        eventNumber: event.eventNumber,
        title: event.title,
        status: event.status,
        statusLabel: statusLabel(event.status),
        rfxType: event.rfxType,
        currencyCode: budget.currencyCode,
        budgetedAmount: budget.amount,
        budgetedAmountLabel: formatProcurementMoney(budget.amount, budget.currencyCode),
        quoteCount: new Set(quotes.map((row) => row.profileId)).size,
        awardCount: awards.length,
        closesAt: event.closesAt.toISOString(),
        biddingOpen,
      });
    }
    const query = filter.query?.trim().toLowerCase() ?? "";
    return views.filter((row) => {
      if (query) {
        const haystack = `${row.eventNumber} ${row.title}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (filter.view === "evaluations") {
        return row.quoteCount > 0;
      }
      if (filter.view === "awards") {
        return row.status === SOURCING_EVENT_STATUSES.AWARDED || row.awardCount > 0;
      }
      return true;
    });
  }

  async getEvaluation(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_READ);
    return this.toEvaluation(context, actor, eventId);
  }

  async create(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    input: CreateSourcingEventCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_CREATE);
    const title = input.title?.trim() ?? "";
    if (!title) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "title",
      });
    }
    const requestIds = [...new Set(input.purchaseRequestIds.filter(Boolean))];
    if (requestIds.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "purchaseRequestIds",
      });
    }
    const rfxType = (input.rfxType?.trim().toUpperCase() || "RFQ");
    if (!RFX_TYPES.has(rfxType)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "rfxType",
      });
    }
    const linked = [];
    for (const requestId of requestIds) {
      const approved = await this.deps.approvedRequests.getApproved(context.businessId, requestId);
      if (!approved) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_APPROVED, undefined, 409);
      }
      linked.push(approved);
    }
    const currencyCode = linked[0]!.currencyCode.trim().toUpperCase();
    let budget = parseMoneyToScaled("0", currencyCode);
    for (const row of linked) {
      if (row.currencyCode.trim().toUpperCase() !== currencyCode) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.CURRENCY_MISMATCH, undefined, 409);
      }
      budget = addScaled(budget, parseNonNegativeAmount(row.estimatedValue, currencyCode, "estimatedValue"));
    }
    let allocated;
    try {
      allocated = await this.deps.numbering.allocate({
        businessId: context.businessId,
        documentType: DOCUMENT_NUMBERING_DOCUMENT_TYPES.SOURCING_EVENT,
      });
    } catch (error) {
      if (error instanceof DocumentNumberingError) {
        throw new ProcurementError(
          PROCUREMENT_ERROR_CODES.NUMBERING_POLICY_MISSING,
          undefined,
          500
        );
      }
      throw error;
    }
    const closesAt = parseIsoDate(input.closesAt, "closesAt");
    const now = new Date();
    if (closesAt.getTime() <= now.getTime()) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "closesAt",
      });
    }
    const riskLevel = (input.riskLevel?.trim().toUpperCase() || RISK_LEVELS.LOW) as string;
    if (!Object.values(RISK_LEVELS).includes(riskLevel as (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS])) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "riskLevel",
      });
    }
    const evaluation = validateEvaluationConfig({
      evaluationMethod: EVALUATION_METHODS.MANUAL,
      technicalWeight: "0",
      financialWeight: "100",
      financialBasis: FINANCIAL_BASES.YEAR_1,
      phases: defaultEvaluationPhases().map((phase) => ({ ...phase, included: false })),
    });
    const control = await this.deps.store.getOrCreateControl(context.businessId);
    const rules = await this.deps.store.listOpeningRules(context.businessId);
    const opening = resolveOpeningPolicy({
      requestedPolicy: input.requestedOpeningPolicy,
      budgetAmount: presentAmount(budget),
      rfxType,
      categoryCode: input.categoryCode?.trim() || null,
      riskLevel,
      control: {
        defaultOpeningPolicy: control.defaultOpeningPolicy as OpeningPolicy,
        extensionRequiresApproval: control.extensionRequiresApproval,
        makerCheckerMinAmount: control.makerCheckerMinAmount,
      },
      rules: rules.map((rule) => ({
        dimension: rule.dimension,
        matchValue: rule.matchValue,
        requiredPolicy: rule.requiredPolicy as OpeningPolicy,
      })),
    });
    const id = randomUUID();
    await this.deps.store.insertEvent({
      id,
      businessId: context.businessId,
      eventNumber: allocated.number,
      rfxType,
      title,
      status: SOURCING_EVENT_STATUSES.ISSUED,
      currencyCode,
      closesAt,
      originalClosesAt: closesAt,
      riskLevel,
      categoryCode: input.categoryCode?.trim() || null,
      openingPolicy: opening.policy,
      openingPolicySource: opening.source,
      evaluationMethod: evaluation.evaluationMethod,
      technicalWeight: evaluation.technicalWeight,
      financialWeight: evaluation.financialWeight,
      financialBasis: evaluation.financialBasis,
      evaluationStage: EVALUATION_STAGES.BIDDING,
      createdBy: actorId(context),
    });
    await this.deps.store.replacePhases(context.businessId, id, evaluation.phases);
    for (const row of linked) {
      await this.deps.store.addPurchaseRequest(context.businessId, id, row.id);
    }
    await this.audit(context, id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_CREATED, {
      eventNumber: allocated.number,
      budgetedAmount: presentAmount(budget),
      currencyCode,
      purchaseRequestIds: requestIds.join(","),
      closesAt: closesAt.toISOString(),
      openingPolicy: opening.policy,
      evaluationMethod: evaluation.evaluationMethod,
    });
    return this.toEvaluation(context, actor, id);
  }

  async extendTender(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: ExtendTenderCommand
  ): Promise<EvaluationWorkspaceView> {
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId: context.businessId,
      operationCode: WORKFLOW_OPERATIONS.SOURCING_EXTENSION_APPROVAL,
    });
    if (decision.required) {
      assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_AWARD);
    } else {
      assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    }
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    const nextClosesAt = parseIsoDate(input.closesAt, "closesAt");
    assertExtensionClock({
      currentClosesAt: event.closesAt,
      nextClosesAt,
      awarded: event.status === SOURCING_EVENT_STATUSES.AWARDED,
    });
    const previousClosesAt = event.closesAt.toISOString();
    await this.deps.store.updateClosesAt(
      context.businessId,
      event.id,
      nextClosesAt,
      actorId(context)
    );
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_EXTENDED, {
      previousClosesAt,
      newClosesAt: nextClosesAt.toISOString(),
      reason: input.reason?.trim() || null,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async inviteSupplier(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: InviteSupplierCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    this.assertBiddingOpen(event);
    const snapshot = await this.deps.suggestedSupplier.resolve(context.businessId, input.profileId);
    if (!snapshot) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
    }
    const eligibility = evaluateSupplierEligibility({
      party: snapshot.party,
      profile: snapshot.profile,
      latestQualification: snapshot.latestQualification,
    });
    if (!eligibility.eligible) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE, undefined, 409);
    }
    const existing = await this.deps.store.listInvitations(event.id);
    if (existing.some((row) => row.profileId === input.profileId)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 409, {
        field: "profileId",
      });
    }
    const accessToken = randomBytes(24).toString("hex");
    await this.deps.store.addInvitation({
      id: randomUUID(),
      businessId: context.businessId,
      eventId: event.id,
      profileId: input.profileId,
      accessToken,
      tokenExpiresAt: event.closesAt,
      createdBy: actorId(context),
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_INVITED, {
      profileId: input.profileId,
      partyName: snapshot.party.displayName,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async submitQuote(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: SubmitQuoteCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    const profileId = input.profileId?.trim();
    if (!profileId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "profileId",
      });
    }
    await this.submitResponse(
      context.businessId,
      event,
      profileId,
      { ...input, capturedOnBehalf: true },
      actorId(context)
    );
    return this.toEvaluation(context, actor, event.id);
  }

  async withdrawQuote(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    profileId: string
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    await this.withdrawLatestQuote(context.businessId, event, profileId, actorId(context));
    return this.toEvaluation(context, actor, event.id);
  }

  async askClarification(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: AskClarificationCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_READ);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    const question = input.question?.trim() ?? "";
    if (!question) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "question",
      });
    }
    const id = randomUUID();
    await this.deps.store.insertClarification({
      id,
      businessId: context.businessId,
      eventId: event.id,
      profileId: input.profileId?.trim() || null,
      question,
      askedBy: actorId(context),
      isBroadcast: true,
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_CLARIFICATION_ASKED, {
      clarificationId: id,
      profileId: input.profileId ?? null,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async answerClarification(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: AnswerClarificationCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    const answer = input.answer?.trim() ?? "";
    if (!answer) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "answer",
      });
    }
    await this.deps.store.answerClarification(
      context.businessId,
      input.clarificationId,
      answer,
      actorId(context),
      true
    );
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_CLARIFICATION_ANSWERED, {
      clarificationId: input.clarificationId,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async closeTender(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.ISSUED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    if (isBiddingOpen({ status: event.status, closesAt: event.closesAt })) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 409, {
        field: "closesAt",
      });
    }
    const closedAt = new Date();
    await this.deps.store.closeTender(context.businessId, event.id, closedAt, actorId(context));
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_TENDER_CLOSED, {
      closedAt: closedAt.toISOString(),
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async setupEvaluationCommittee(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: SetupEvaluationCommitteeCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.CLOSED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    assertEvaluationStage(event.evaluationStage, EVALUATION_STAGES.BIDS_RECEIVED);
    const members = validateCommitteeMembers(input.members ?? []);
    await this.deps.store.replaceCommitteeMembers(
      context.businessId,
      event.id,
      members.map((member, index) => ({
        id: randomUUID(),
        sequence: index + 1,
        memberName: member.memberName,
        roleLabel: member.roleLabel ?? null,
        userId: member.userId ?? null,
        createdBy: actorId(context),
      }))
    );
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_COMMITTEE_CONFIGURED, {
      memberCount: String(members.length),
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_COMMITTEE_CONSTITUTED, {
      memberCount: String(members.length),
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async lockEvaluationCriteria(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.CLOSED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    if (event.criteriaLockedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CRITERIA_LOCKED, undefined, 409);
    }
    assertEvaluationStage(event.evaluationStage, EVALUATION_STAGES.CRITERIA_SET);
    const committee = await this.deps.store.listCommitteeMembers(event.id);
    if (committee.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    const phases = await this.deps.store.listPhases(event.id);
    const snapshot = buildCriteriaSnapshot({
      evaluationMethod: event.evaluationMethod,
      technicalWeight: event.technicalWeight,
      financialWeight: event.financialWeight,
      financialBasis: event.financialBasis,
      phases,
    });
    const snapshotJson = JSON.stringify(snapshot);
    const lockedAt = new Date();
    const lockedBy = actorId(context);
    await this.deps.store.lockEvaluationCriteria(context.businessId, event.id, {
      lockedAt,
      lockedBy,
      snapshotHash: hashCriteriaSnapshot(snapshot),
      snapshotJson,
      evaluationStage: EVALUATION_STAGES.CRITERIA_LOCKED,
      updatedBy: lockedBy,
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_CRITERIA_LOCKED, {
      criteriaSnapshotHash: hashCriteriaSnapshot(snapshot),
      lockedAt: lockedAt.toISOString(),
      lockedBy,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async approveAward(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: { approvedBy?: string | null } = {}
  ): Promise<EvaluationWorkspaceView> {
    const decision = await this.deps.workflow.evaluateOperationApproval({
      businessId: context.businessId,
      operationCode: WORKFLOW_OPERATIONS.SOURCING_AWARD_APPROVAL,
    });
    if (!decision.required) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
    }
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_AWARD);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.awardApprovalStatus !== "PENDING") {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
    }
    const approverId = input.approvedBy?.trim() || actorId(context);
    const submitterId = event.awardSubmittedBy;
    if (submitterId && approverId && submitterId === approverId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SELF_APPROVAL, undefined, 409);
    }
    if (submitterId && approverId) {
      this.deps.workflow.assertDistinctActors(submitterId, approverId);
    }
    const approvedAt = new Date();
    await this.deps.store.updateAwardApproval(context.businessId, event.id, {
      awardApprovalStatus: "APPROVED",
      awardApprovedAt: approvedAt,
      awardApprovedBy: approverId,
      updatedBy: approverId,
    });
    await this.deps.store.updateEventStatus(
      context.businessId,
      event.id,
      SOURCING_EVENT_STATUSES.AWARDED,
      event.recommendation,
      approverId
    );
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_AWARD_APPROVED, {
      approvedAt: approvedAt.toISOString(),
      approvedBy: approverId,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async configureEvaluationCriteria(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: ConfigureEvaluationCriteriaCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.criteriaLockedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CRITERIA_LOCKED, undefined, 409);
    }
    if (event.status !== SOURCING_EVENT_STATUSES.CLOSED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    assertEvaluationStage(event.evaluationStage, EVALUATION_STAGES.COMMITTEE_SET);
    const evaluation = validateEvaluationConfig({
      evaluationMethod: input.evaluationMethod,
      technicalWeight: input.technicalWeight ?? "0",
      financialWeight: input.financialWeight ?? "100",
      financialBasis: input.financialBasis ?? FINANCIAL_BASES.YEAR_1,
      phases:
        input.phases?.map((phase, index) => ({
          phaseCode: phase.phaseCode,
          included: phase.included,
          sequence: phase.sequence ?? index + 1,
          weight: phase.weight,
          passmark: phase.passmark,
          required: phase.required,
        })) ?? defaultEvaluationPhases(),
    });
    await this.deps.store.updateEvaluationCriteria(context.businessId, event.id, {
      evaluationMethod: evaluation.evaluationMethod,
      technicalWeight: evaluation.technicalWeight,
      financialWeight: evaluation.financialWeight,
      financialBasis: evaluation.financialBasis,
      evaluationStage: EVALUATION_STAGES.CRITERIA_SET,
      updatedBy: actorId(context),
    });
    await this.deps.store.replacePhases(context.businessId, event.id, evaluation.phases);
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_CRITERIA_CONFIGURED, {
      evaluationMethod: evaluation.evaluationMethod,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async startEvaluation(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.CLOSED) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    assertEvaluationStage(event.evaluationStage, EVALUATION_STAGES.CRITERIA_LOCKED);
    const startedAt = new Date();
    await this.deps.store.startEvaluation(
      context.businessId,
      event.id,
      startedAt,
      actorId(context)
    );
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_EVALUATION_STARTED, {
      startedAt: startedAt.toISOString(),
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async recordDueDiligence(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: RecordDueDiligenceCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_AWARD);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.EVALUATING) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    const diligence = validateDueDiligence({
      required: Boolean(input.required),
      locationVerified: Boolean(input.locationVerified),
      staffVerified: Boolean(input.staffVerified),
      legalVerified: Boolean(input.legalVerified),
      otherNotes: input.otherNotes ?? null,
    });
    const recordedAt = new Date();
    await this.deps.store.updateDueDiligence(context.businessId, event.id, {
      dueDiligenceRequired: diligence.required,
      dueDiligenceLocationVerified: diligence.locationVerified ?? false,
      dueDiligenceStaffVerified: diligence.staffVerified ?? false,
      dueDiligenceLegalVerified: diligence.legalVerified ?? false,
      dueDiligenceOtherNotes: diligence.otherNotes ?? null,
      dueDiligenceRecordedAt: recordedAt,
      updatedBy: actorId(context),
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_DUE_DILIGENCE_RECORDED, {
      required: diligence.required ? "true" : "false",
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async openBids(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: OpenBidsCommand = {}
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.EVALUATING) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_STAGE_INVALID, undefined, 409);
    }
    if (event.bidsOpenedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 409);
    }
    if (!event.criteriaLockedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.CRITERIA_NOT_LOCKED, undefined, 409);
    }
    const openerId = actorId(context);
    let openingApprovedBy: string | null = null;
    if (event.openingPolicy === OPENING_POLICIES.MAKER_CHECKER) {
      openingApprovedBy = input.openingApprovedBy?.trim() || null;
      if (!openingApprovedBy) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
          field: "openingApprovedBy",
        });
      }
      if (!openerId || openingApprovedBy === openerId) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.SELF_APPROVAL, undefined, 409);
      }
      this.deps.workflow.assertDistinctActors(openerId, openingApprovedBy);
      assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_AWARD);
    }
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_BID_OPENING_REQUESTED, {
      openedBy: openerId,
      openingPolicy: event.openingPolicy,
    });
    if (openingApprovedBy) {
      await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_BID_OPENING_APPROVED, {
        openingApprovedBy,
      });
    }
    const recommendedProfileIds = await this.computeRecommendedProfileIds(context.businessId, event.id);
    const openedAt = new Date();
    await this.deps.store.openBids(context.businessId, event.id, {
      openedAt,
      openedBy: openerId,
      openingApprovedBy,
      recommendedProfileIds: recommendedProfileIds.join(","),
      updatedBy: openerId,
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_BIDS_OPENED, {
      openedAt: openedAt.toISOString(),
      openedBy: openerId,
      openingApprovedBy,
      openingPolicy: event.openingPolicy,
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async recordPhaseScores(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: RecordPhaseScoresCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.EVALUATING || !event.bidsOpenedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.BIDS_NOT_OPENED, undefined, 409);
    }
    const profileId = input.profileId?.trim() ?? "";
    if (!profileId) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "profileId",
      });
    }
    const phases = await this.deps.store.listPhases(event.id);
    const includedCodes = new Set(phases.filter((row) => row.included).map((row) => row.phaseCode));
    const scores = (input.scores ?? []).filter((row) => includedCodes.has(row.phaseCode));
    await this.deps.store.upsertPhaseScores(
      context.businessId,
      event.id,
      profileId,
      scores.map((row) => ({
        id: randomUUID(),
        phaseCode: row.phaseCode,
        score: row.score,
        scoredBy: actorId(context),
      }))
    );
    const recommendedProfileIds = await this.computeRecommendedProfileIds(context.businessId, event.id);
    await this.deps.store.openBids(context.businessId, event.id, {
      openedAt: event.bidsOpenedAt,
      openedBy: event.bidsOpenedBy,
      openingApprovedBy: event.bidsOpeningApprovedBy,
      recommendedProfileIds: recommendedProfileIds.join(","),
      updatedBy: actorId(context),
    });
    await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_PHASE_SCORED, {
      profileId,
      scoreCount: String(scores.length),
    });
    return this.toEvaluation(context, actor, event.id);
  }

  async getPortalByToken(token: string): Promise<SupplierPortalView> {
    return this.toPortal(token, true);
  }

  async submitQuoteByToken(token: string, input: SubmitQuoteCommand): Promise<SupplierPortalView> {
    const invitation = await this.requireUsableInvitation(token.trim());
    const event = requireEvent(
      await this.deps.store.findEvent(invitation.businessId, invitation.eventId)
    );
    await this.submitResponse(invitation.businessId, event, invitation.profileId, input, null);
    return this.toPortal(token.trim(), false);
  }

  async withdrawQuoteByToken(token: string): Promise<SupplierPortalView> {
    const invitation = await this.requireUsableInvitation(token.trim());
    const event = requireEvent(
      await this.deps.store.findEvent(invitation.businessId, invitation.eventId)
    );
    await this.withdrawLatestQuote(invitation.businessId, event, invitation.profileId, null);
    return this.toPortal(token.trim(), false);
  }

  async askClarificationByToken(token: string, question: string): Promise<SupplierPortalView> {
    const invitation = await this.requireUsableInvitation(token.trim());
    const event = requireEvent(
      await this.deps.store.findEvent(invitation.businessId, invitation.eventId)
    );
    const text = question.trim();
    if (!text) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "question",
      });
    }
    const id = randomUUID();
    await this.deps.store.insertClarification({
      id,
      businessId: invitation.businessId,
      eventId: event.id,
      profileId: invitation.profileId,
      question: text,
      askedBy: `token:${token.trim()}`,
      isBroadcast: true,
    });
    await this.deps.audit.record({
      businessId: invitation.businessId,
      actorUserId: null,
      entityId: event.id,
      action: PROCUREMENT_AUDIT_ACTIONS.SOURCING_CLARIFICATION_ASKED,
      outcome: "SUCCESS",
      references: { clarificationId: id, profileId: invitation.profileId },
    });
    return this.toPortal(token.trim(), false);
  }

  async awardSuppliers(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string,
    input: AwardSourcingCommand
  ): Promise<EvaluationWorkspaceView> {
    assertPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_AWARD);
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    if (event.status !== SOURCING_EVENT_STATUSES.EVALUATING) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
    }
    if (!event.bidsOpenedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.BIDS_NOT_OPENED, undefined, 409);
    }
    if (
      !isDueDiligenceComplete({
        required: event.dueDiligenceRequired,
        locationVerified: event.dueDiligenceLocationVerified,
        staffVerified: event.dueDiligenceStaffVerified,
        legalVerified: event.dueDiligenceLegalVerified,
        recordedAt: event.dueDiligenceRecordedAt,
      })
    ) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.DUE_DILIGENCE_INCOMPLETE, undefined, 409);
    }
    if (!input.awards?.length && !input.lineAwards?.length) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 400);
    }
    const budget = await this.resolveBudget(context.businessId, event.id);
    const invitations = await this.deps.store.listInvitations(event.id);
    const quotes = await this.deps.store.listQuotes(event.id);
    const recommendedProfileIds = (event.recommendedProfileIds ?? "")
      .split(",")
      .map((row) => row.trim())
      .filter(Boolean);
    let allocatedTotal = parseMoneyToScaled("0", budget.currencyCode);
    const prepared: Array<{
      profileId: string;
      awardedAmount: string;
      allocatedBudgetAmount: string;
      initialQuote: string;
      finalQuote: string;
      winningQuoteId: string;
      awardLineDrafts: ReturnType<typeof buildAwardLinesFromQuote>;
    }> = [];

    if (input.lineAwards?.length) {
      const byProfile = new Map<
        string,
        Array<{
          lineSequence: number;
          winningQuoteLineId: string | null;
          description: string;
          quantity: string;
          unitPrice: string;
          taxRate: string;
          lineTotal: string;
        }>
      >();
      const winningQuoteByProfile = new Map<string, string>();
      for (const selection of input.lineAwards) {
        const profileId = selection.profileId.trim();
        if (!profileId) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
            field: "lineAwards.profileId",
          });
        }
        if (!invitations.some((row) => row.profileId === profileId)) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === profileId));
        const latestQuote = versions[versions.length - 1];
        if (!latestQuote) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        winningQuoteByProfile.set(profileId, latestQuote.id);
        const quoteLines = await this.deps.store.listQuoteLines(latestQuote.id);
        const quoteLine =
          selection.winningQuoteLineId?.trim()
            ? quoteLines.find((row) => row.id === selection.winningQuoteLineId!.trim())
            : quoteLines.find((row) => row.sequence === selection.lineSequence);
        if (!quoteLine) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        const rows = byProfile.get(profileId) ?? [];
        if (rows.some((row) => row.lineSequence === quoteLine.sequence)) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        rows.push({
          lineSequence: quoteLine.sequence,
          winningQuoteLineId: quoteLine.id,
          description: quoteLine.description,
          quantity: quoteLine.quantity,
          unitPrice: quoteLine.unitPrice,
          taxRate: quoteLine.taxRate,
          lineTotal: quoteLine.lineTotal,
        });
        byProfile.set(profileId, rows);
      }
      for (const [profileId, lines] of byProfile.entries()) {
        const snapshot = await this.deps.suggestedSupplier.resolve(context.businessId, profileId);
        if (!snapshot) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
        }
        const eligibility = evaluateSupplierEligibility({
          party: snapshot.party,
          profile: snapshot.profile,
          latestQualification: snapshot.latestQualification,
        });
        if (!eligibility.eligible) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE, undefined, 409);
        }
        const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === profileId));
        const quotesForSupplier = initialAndFinalFromVersions(versions);
        if (!quotesForSupplier) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        const winningQuoteId = winningQuoteByProfile.get(profileId)!;
        let awardedScaled = parseMoneyToScaled("0", budget.currencyCode);
        const awardLineDrafts = lines.map((line) => {
          const lineScaled = parseNonNegativeAmount(line.lineTotal, budget.currencyCode, "lineTotal");
          awardedScaled = addScaled(awardedScaled, lineScaled);
          return buildSplitAwardLineDrafts({
            lineSequence: line.lineSequence,
            winningQuoteLineId: line.winningQuoteLineId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            lineTotal: line.lineTotal,
          });
        });
        const awardedAmount = presentAmount(awardedScaled);
        allocatedTotal = addScaled(allocatedTotal, awardedScaled);
        prepared.push({
          profileId,
          awardedAmount,
          allocatedBudgetAmount: awardedAmount,
          initialQuote: quotesForSupplier.initialQuote,
          finalQuote: awardedAmount,
          winningQuoteId,
          awardLineDrafts,
        });
      }
    } else {
      const uniqueAwards = [...new Map(input.awards!.map((row) => [row.profileId, row])).values()];
      const awardedProfileIds = uniqueAwards.map((row) => row.profileId);
      if (
        requiresAwardOverride(recommendedProfileIds, awardedProfileIds) &&
        !(input.overrideReason?.trim() || event.awardOverrideReason?.trim())
      ) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_OVERRIDE_REQUIRED, undefined, 409);
      }
      for (const award of uniqueAwards) {
        const invited = invitations.some((row) => row.profileId === award.profileId);
        if (!invited) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        const snapshot = await this.deps.suggestedSupplier.resolve(
          context.businessId,
          award.profileId
        );
        if (!snapshot) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.PROFILE_NOT_FOUND, undefined, 404);
        }
        const eligibility = evaluateSupplierEligibility({
          party: snapshot.party,
          profile: snapshot.profile,
          latestQualification: snapshot.latestQualification,
        });
        if (!eligibility.eligible) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.SUPPLIER_NOT_ELIGIBLE, undefined, 409);
        }
        const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === award.profileId));
        const quotesForSupplier = initialAndFinalFromVersions(versions);
        if (!quotesForSupplier) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        const latestQuote = versions[versions.length - 1];
        const winningQuoteId = award.winningQuoteId?.trim() || latestQuote?.id;
        if (!winningQuoteId) {
          throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
        }
        const finalQuote = parseNonNegativeAmount(
          quotesForSupplier.finalQuote,
          budget.currencyCode,
          "finalQuote"
        );
        const allocated = award.allocatedBudgetAmount?.trim()
          ? parseNonNegativeAmount(
              award.allocatedBudgetAmount,
              budget.currencyCode,
              "allocatedBudgetAmount"
            )
          : finalQuote;
        allocatedTotal = addScaled(allocatedTotal, allocated);
        const quoteLines = await this.deps.store.listQuoteLines(winningQuoteId);
        prepared.push({
          profileId: award.profileId,
          awardedAmount: presentAmount(finalQuote),
          allocatedBudgetAmount: presentAmount(allocated),
          initialQuote: quotesForSupplier.initialQuote,
          finalQuote: quotesForSupplier.finalQuote,
          winningQuoteId,
          awardLineDrafts: buildAwardLinesFromQuote({
            quoteLines: quoteLines.map((line) => ({
              id: line.id,
              sequence: line.sequence,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              taxRate: line.taxRate,
              lineTotal: line.lineTotal,
            })),
            headerAmount: presentAmount(finalQuote),
            currencyCode: budget.currencyCode,
          }),
        });
      }
    }

    const awardedProfileIds = prepared.map((row) => row.profileId);
    if (
      !input.lineAwards?.length &&
      requiresAwardOverride(recommendedProfileIds, awardedProfileIds) &&
      !(input.overrideReason?.trim() || event.awardOverrideReason?.trim())
    ) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_OVERRIDE_REQUIRED, undefined, 409);
    }
    if (
      input.lineAwards?.length &&
      requiresAwardOverride(recommendedProfileIds, awardedProfileIds) &&
      !(input.overrideReason?.trim() || event.awardOverrideReason?.trim())
    ) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_OVERRIDE_REQUIRED, undefined, 409);
    }

    const budgetScaled = parseNonNegativeAmount(budget.amount, budget.currencyCode, "budgetedAmount");
    if (allocatedTotal.units > budgetScaled.units) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.AWARD_INVALID, undefined, 409);
    }
    const overrideReason = input.overrideReason?.trim() || null;
    const awardDecision = await this.deps.workflow.evaluateOperationApproval({
      businessId: context.businessId,
      operationCode: WORKFLOW_OPERATIONS.SOURCING_AWARD_APPROVAL,
    });
    for (const row of prepared) {
      const awardId = randomUUID();
      await this.deps.store.insertAward({
        id: awardId,
        businessId: context.businessId,
        eventId: event.id,
        profileId: row.profileId,
        awardedAmount: row.awardedAmount,
        allocatedBudgetAmount: row.allocatedBudgetAmount,
        currencyCode: budget.currencyCode,
        winningQuoteId: row.winningQuoteId,
        overrideReason,
        createdBy: actorId(context),
      });
      await this.deps.store.insertAwardLines(
        row.awardLineDrafts.map((line) => ({
          id: randomUUID(),
          businessId: context.businessId,
          awardId,
          winningQuoteId: row.winningQuoteId,
          winningQuoteLineId: line.winningQuoteLineId,
          sequence: line.sequence,
          description: line.description,
          quantity: line.quantity,
          uom: line.uom,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          lineTotal: line.lineTotal,
          currencyCode: budget.currencyCode,
          createdBy: actorId(context),
        }))
      );
      await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_AWARDED, {
        profileId: row.profileId,
        awardedAmount: row.awardedAmount,
        allocatedBudgetAmount: row.allocatedBudgetAmount,
        initialQuote: row.initialQuote,
        finalQuote: row.finalQuote,
        winningQuoteId: row.winningQuoteId,
        overrideReason,
        previousStatus: event.status,
        newStatus: awardDecision.required
          ? "PENDING_APPROVAL"
          : SOURCING_EVENT_STATUSES.AWARDED,
      });
    }
    const recommendation = input.recommendation?.trim() || null;
    if (awardDecision.required) {
      const submittedAt = new Date();
      const submittedBy = actorId(context);
      await this.deps.store.updateAwardApproval(context.businessId, event.id, {
        awardApprovalStatus: "PENDING",
        awardSubmittedAt: submittedAt,
        awardSubmittedBy: submittedBy,
        recommendation,
        updatedBy: submittedBy,
      });
      await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_AWARD_SUBMITTED, {
        submittedAt: submittedAt.toISOString(),
        submittedBy,
      });
    } else {
      await this.deps.store.updateEventStatus(
        context.businessId,
        event.id,
        SOURCING_EVENT_STATUSES.AWARDED,
        recommendation,
        actorId(context)
      );
    }
    return this.toEvaluation(context, actor, event.id);
  }

  private async requireUsableInvitation(token: string) {
    const invitation = await this.deps.store.findInvitationByToken(token);
    if (!invitation) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVITATION_NOT_FOUND, undefined, 404);
    }
    if (invitation.revokedAt) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVITATION_REVOKED, undefined, 409);
    }
    const event = await this.deps.store.findEvent(invitation.businessId, invitation.eventId);
    if (!event) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SOURCING_NOT_FOUND, undefined, 404);
    }
    const expiresAt = invitation.tokenExpiresAt ?? event.closesAt;
    if (expiresAt.getTime() <= Date.now()) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVITATION_REVOKED, undefined, 409);
    }
    return invitation;
  }

  private assertBiddingOpen(event: {
    status: string;
    closesAt: Date | string;
  }) {
    if (!isBiddingOpen({ status: event.status, closesAt: event.closesAt })) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.TENDER_CLOSED, undefined, 409);
    }
  }

  private async submitResponse(
    businessId: string,
    event: {
      id: string;
      status: string;
      currencyCode: string;
      closesAt: Date | string;
    },
    profileId: string,
    input: SubmitQuoteCommand,
    submittedBy: string | null
  ) {
    this.assertBiddingOpen(event);
    const invitations = await this.deps.store.listInvitations(event.id);
    if (!invitations.some((row) => row.profileId === profileId)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVITATION_NOT_FOUND, undefined, 404);
    }
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey) {
      const existing = await this.deps.store.findQuoteByIdempotencyKey(
        event.id,
        profileId,
        idempotencyKey
      );
      if (existing) {
        return;
      }
    }
    const paymentTerms = validatePaymentTermsSchedule(input.paymentTerms ?? []);
    const lineRows = (input.lines ?? []).map((line, index) => {
      const description = line.description?.trim() ?? "";
      if (!description) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
          field: `lines.${index}.description`,
        });
      }
      const lineTotal = computeLineTotal(line.quantity, line.unitPrice, line.taxRate);
      return {
        sequence: index + 1,
        description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate?.trim() || "0",
        lineTotal,
      };
    });
    const headerAmount = input.amount?.trim()
      ? input.amount
      : lineRows.length > 0
        ? sumLineTotals(lineRows)
        : "";
    if (!headerAmount) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: "amount",
      });
    }
    const parsed = parseNonNegativeAmount(headerAmount, event.currencyCode, "amount");
    const existing = activeQuoteVersions(await this.deps.store.listQuotes(event.id, profileId));
    const previous = existing[existing.length - 1]?.amount ?? null;
    const version = existing.length + 1;
    const quoteId = randomUUID();
    const capturedOnBehalf = Boolean(input.capturedOnBehalf) || Boolean(submittedBy);
    await this.deps.store.insertQuote({
      id: quoteId,
      businessId,
      eventId: event.id,
      profileId,
      version,
      amount: presentAmount(parsed),
      currencyCode: event.currencyCode,
      status: QUOTE_STATUSES.ACTIVE,
      comments: input.comments?.trim() || null,
      deliveryLeadDays: input.deliveryLeadDays ?? null,
      warrantyNotes: input.warrantyNotes?.trim() || null,
      year1Amount: input.year1Amount?.trim() || null,
      tcvAmount: input.tcvAmount?.trim() || null,
      tcoAmount: input.tcoAmount?.trim() || null,
      capturedOnBehalf,
      idempotencyKey,
      submittedBy,
    });
    if (lineRows.length > 0) {
      await this.deps.store.insertQuoteLines(businessId, quoteId, lineRows);
    }
    if (paymentTerms.length > 0) {
      await this.deps.store.insertPaymentTerms(
        businessId,
        quoteId,
        paymentTerms.map((term, index) => ({
          sequence: index + 1,
          milestoneName: term.milestoneName,
          percentage: term.percentage,
          amount: term.amount ?? null,
          triggerEvent: term.triggerEvent ?? null,
          duePeriodDays: term.duePeriodDays ?? null,
          comments: term.comments ?? null,
        }))
      );
    }
    await this.deps.store.updateInvitationResponseStatus(
      event.id,
      profileId,
      INVITATION_RESPONSE_STATUSES.SUBMITTED
    );
    await this.deps.audit.record({
      businessId,
      actorUserId: submittedBy,
      entityId: event.id,
      action: PROCUREMENT_AUDIT_ACTIONS.SOURCING_QUOTE_SUBMITTED,
      outcome: "SUCCESS",
      references: {
        profileId,
        version: String(version),
        previousAmount: previous,
        newAmount: presentAmount(parsed),
        capturedOnBehalf: capturedOnBehalf ? "true" : "false",
        lineCount: String(lineRows.length),
      },
    });
    void this.notifyBidSubmitted(businessId, event.id, profileId, version);
  }

  private async withdrawLatestQuote(
    businessId: string,
    event: {
      id: string;
      status: string;
      closesAt: Date | string;
    },
    profileId: string,
    actorUserId: string | null
  ) {
    this.assertBiddingOpen(event);
    const quotes = activeQuoteVersions(await this.deps.store.listQuotes(event.id, profileId));
    const latest = quotes[quotes.length - 1];
    if (!latest) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 409);
    }
    for (const quote of quotes) {
      await this.deps.store.updateQuoteStatus(quote.id, QUOTE_STATUSES.WITHDRAWN);
    }
    await this.deps.store.updateInvitationResponseStatus(
      event.id,
      profileId,
      INVITATION_RESPONSE_STATUSES.WITHDRAWN
    );
    await this.deps.audit.record({
      businessId,
      actorUserId,
      entityId: event.id,
      action: PROCUREMENT_AUDIT_ACTIONS.SOURCING_QUOTE_WITHDRAWN,
      outcome: "SUCCESS",
      references: {
        profileId,
        version: String(latest.version),
        amount: latest.amount,
      },
    });
  }

  private async notifyBidSubmitted(
    businessId: string,
    eventId: string,
    profileId: string,
    version: number
  ) {
    try {
      const snapshot = await this.deps.suggestedSupplier.resolve(businessId, profileId);
      await this.deps.notifications.requestDocumentDelivery({
        businessId,
        documentType: "PROCUREMENT_BID_ACK",
        referenceId: eventId,
        channel: "EMAIL",
        recipientHint: snapshot?.party.displayName ?? null,
        payload: { profileId, version: String(version) },
      });
    } catch {
      // Bid remains stored even when notification delivery fails.
    }
  }

  private async mapQuoteVersion(
    row: Awaited<ReturnType<SourcingStorePort["listQuotes"]>>[number]
  ): Promise<SourcingQuoteVersion> {
    const lines = await this.deps.store.listQuoteLines(row.id);
    const terms = await this.deps.store.listPaymentTerms(row.id);
    return {
      id: row.id,
      version: row.version,
      amount: row.amount,
      currencyCode: row.currencyCode,
      amountLabel: formatProcurementMoney(row.amount, row.currencyCode),
      submittedAt: row.submittedAt.toISOString(),
      status: row.status,
      statusLabel: row.status === QUOTE_STATUSES.WITHDRAWN ? "Withdrawn" : "Active",
      comments: row.comments,
      deliveryLeadDays: row.deliveryLeadDays,
      warrantyNotes: row.warrantyNotes,
      year1Amount: row.year1Amount,
      tcvAmount: row.tcvAmount,
      tcoAmount: row.tcoAmount,
      capturedOnBehalf: row.capturedOnBehalf,
      lines: lines.map((line) => ({
        ...line,
        lineTotalLabel: formatProcurementMoney(line.lineTotal, row.currencyCode),
      })),
      paymentTerms: terms,
    };
  }

  private async mapClarifications(
    businessId: string,
    eventId: string,
    profileId?: string | null
  ): Promise<ClarificationView[]> {
    const rows = await this.deps.store.listClarifications(eventId, profileId);
    const views: ClarificationView[] = [];
    for (const row of rows) {
      views.push({
        id: row.id,
        profileId: row.profileId,
        partyName: row.profileId
          ? await this.partyDisplayName(businessId, row.profileId)
          : null,
        question: row.question,
        answer: row.answer,
        isBroadcast: row.isBroadcast,
        createdAt: row.createdAt.toISOString(),
        answeredAt: row.answeredAt?.toISOString() ?? null,
      });
    }
    return views;
  }

  private async resolveBudget(businessId: string, eventId: string) {
    const event = requireEvent(await this.deps.store.findEvent(businessId, eventId));
    const prIds = await this.deps.store.listEventPrIds(eventId);
    const linked = [];
    for (const requestId of prIds) {
      const row = await this.deps.approvedRequests.getLinked(businessId, requestId);
      if (!row) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_FOUND, undefined, 404);
      }
      linked.push(row);
    }
    if (linked.length === 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 409);
    }
    const currencyCode = event.currencyCode.trim().toUpperCase();
    let budget = parseMoneyToScaled("0", currencyCode);
    const numbers: string[] = [];
    for (const row of linked) {
      if (row.currencyCode.trim().toUpperCase() !== currencyCode) {
        throw new ProcurementError(PROCUREMENT_ERROR_CODES.CURRENCY_MISMATCH, undefined, 409);
      }
      budget = addScaled(
        budget,
        parseNonNegativeAmount(row.estimatedValue, currencyCode, "estimatedValue")
      );
      numbers.push(row.requestNumber);
    }
    return {
      amount: presentAmount(budget),
      currencyCode,
      purchaseRequestNumbers: numbers,
    };
  }

  private async partyDisplayName(businessId: string, profileId: string) {
    const snapshot = await this.deps.suggestedSupplier.resolve(businessId, profileId);
    return snapshot?.party.displayName ?? "Supplier";
  }

  private async computeRecommendedProfileIds(businessId: string, eventId: string) {
    const event = requireEvent(await this.deps.store.findEvent(businessId, eventId));
    const quotes = await this.deps.store.listQuotes(eventId);
    const quotedProfileIds = [...new Set(quotes.map((row) => row.profileId))];
    const phases = await this.deps.store.listPhases(eventId);
    const phaseScores = await this.deps.store.listPhaseScores(eventId);
    const rows = buildSupplierEvaluationRows({
      evaluationMethod: event.evaluationMethod,
      financialBasis: event.financialBasis,
      technicalWeight: event.technicalWeight,
      financialWeight: event.financialWeight,
      phases,
      quotes: quotedProfileIds.map((profileId) => {
        const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === profileId));
        const latest = versions[versions.length - 1];
        return {
          profileId,
          amount: latest?.amount ?? "0",
          year1Amount: latest?.year1Amount ?? null,
          tcvAmount: latest?.tcvAmount ?? null,
          tcoAmount: latest?.tcoAmount ?? null,
        };
      }),
      phaseScores,
    });
    return rows.filter((row) => row.recommended).map((row) => row.profileId);
  }

  private async toEvaluation(
    context: CurrentBusinessContext,
    actor: ProcurementActor,
    eventId: string
  ): Promise<EvaluationWorkspaceView> {
    const event = requireEvent(await this.deps.store.findEvent(context.businessId, eventId));
    const budget = await this.resolveBudget(context.businessId, event.id);
    const invitations = await this.deps.store.listInvitations(event.id);
    const quotes = await this.deps.store.listQuotes(event.id);
    const awards = await this.deps.store.listAwards(event.id);
    const awardedIds = new Set(awards.map((row) => row.profileId));
    const quotedProfileIds = [...new Set(quotes.map((row) => row.profileId))];
    const commercialSealed = isCommercialSealedToBuyer(event.status, event.bidsOpenedAt);
    const lockedSnapshot = parseCriteriaSnapshot(event.criteriaSnapshotJson);
    const phases =
      lockedSnapshot?.phases ??
      (await this.deps.store.listPhases(event.id));
    const evaluationMethod = lockedSnapshot?.evaluationMethod ?? event.evaluationMethod;
    const technicalWeight = lockedSnapshot?.technicalWeight ?? event.technicalWeight;
    const financialWeight = lockedSnapshot?.financialWeight ?? event.financialWeight;
    const financialBasis = lockedSnapshot?.financialBasis ?? event.financialBasis;
    const phaseScores = await this.deps.store.listPhaseScores(event.id);
    if (!commercialSealed && quotedProfileIds.length > 0) {
      await this.deps.store.recordBidAccess({
        businessId: context.businessId,
        eventId: event.id,
        actorUserId: actorId(context),
        action: "VIEW_COMPARISON",
      });
      await this.audit(context, event.id, PROCUREMENT_AUDIT_ACTIONS.SOURCING_BID_CONTENT_VIEWED, {
        actorUserId: actorId(context) ?? "",
        view: "comparison",
      });
    }
    const evaluationRows =
      !commercialSealed && quotedProfileIds.length > 0
        ? buildSupplierEvaluationRows({
            evaluationMethod,
            financialBasis,
            technicalWeight,
            financialWeight,
            phases,
            quotes: quotedProfileIds.map((profileId) => {
              const versions = activeQuoteVersions(
                quotes.filter((row) => row.profileId === profileId)
              );
              const latest = versions[versions.length - 1];
              return {
                profileId,
                amount: latest?.amount ?? "0",
                year1Amount: latest?.year1Amount ?? null,
                tcvAmount: latest?.tcvAmount ?? null,
                tcoAmount: latest?.tcoAmount ?? null,
              };
            }),
            phaseScores,
          })
        : [];
    const evaluationByProfile = new Map(evaluationRows.map((row) => [row.profileId, row]));
    const recommendedProfileIds = (event.recommendedProfileIds ?? "")
      .split(",")
      .map((row) => row.trim())
      .filter(Boolean);
    const lineComparison = [];
    if (!commercialSealed) {
      const sequenceMap = new Map<
        number,
        { description: string; suppliers: Array<{ profileId: string; partyName: string; lineTotal: string; lineTotalLabel: string }> }
      >();
      for (const profileId of quotedProfileIds) {
        const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === profileId));
        const latest = versions[versions.length - 1];
        if (!latest) {
          continue;
        }
        const quoteLines = await this.deps.store.listQuoteLines(latest.id);
        const partyName = await this.partyDisplayName(context.businessId, profileId);
        for (const line of quoteLines) {
          const current = sequenceMap.get(line.sequence) ?? {
            description: line.description,
            suppliers: [],
          };
          current.suppliers.push({
            profileId,
            partyName,
            lineTotal: line.lineTotal,
            lineTotalLabel: formatProcurementMoney(line.lineTotal, budget.currencyCode),
          });
          sequenceMap.set(line.sequence, current);
        }
      }
      for (const [sequence, row] of [...sequenceMap.entries()].sort((a, b) => a[0] - b[0])) {
        lineComparison.push({ sequence, description: row.description, suppliers: row.suppliers });
      }
    }
    const comparison = [];
    if (!commercialSealed) {
      for (const profileId of quotedProfileIds) {
        const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === profileId));
        const pair = initialAndFinalFromVersions(versions);
        if (!pair) {
          continue;
        }
        const outcome = computeCommercialOutcome({
          budgetedAmount: budget.amount,
          initialQuote: pair.initialQuote,
          finalQuote: pair.finalQuote,
          currencyCode: budget.currencyCode,
        });
        const evaluation = evaluationByProfile.get(profileId);
        const latestQuote = versions[versions.length - 1];
        comparison.push({
          profileId,
          partyName: await this.partyDisplayName(context.businessId, profileId),
          outcome,
          labels: labelCommercialOutcome(outcome),
          awarded: awardedIds.has(profileId),
          finalExceedsInitial: outcome.finalExceedsInitial,
          technicalScore: evaluation?.technicalScore ?? null,
          financialScore: evaluation?.financialScore ?? null,
          overallScore: evaluation?.overallScore ?? null,
          rank: evaluation?.rank ?? null,
          technicallyQualified: evaluation?.technicallyQualified ?? true,
          recommended: evaluation?.recommended ?? false,
          winningQuoteId: latestQuote?.id ?? null,
        });
      }
    }
    const awardViews = [];
    for (const award of awards) {
      const versions = activeQuoteVersions(quotes.filter((row) => row.profileId === award.profileId));
      const pair = initialAndFinalFromVersions(versions);
      if (!pair) {
        continue;
      }
      const outcome = computeCommercialOutcome({
        budgetedAmount: award.allocatedBudgetAmount,
        initialQuote: pair.initialQuote,
        finalQuote: pair.finalQuote,
        currencyCode: budget.currencyCode,
        awardedAmount: award.awardedAmount,
      });
      awardViews.push({
        profileId: award.profileId,
        partyName: await this.partyDisplayName(context.businessId, award.profileId),
        allocatedBudgetAmount: award.allocatedBudgetAmount,
        allocatedBudgetLabel: formatProcurementMoney(
          award.allocatedBudgetAmount,
          budget.currencyCode
        ),
        outcome,
        labels: labelCommercialOutcome(outcome),
      });
    }
    const invitationViews = [];
    for (const invitation of invitations) {
      const supplierQuotes = quotes.filter((row) => row.profileId === invitation.profileId);
      const responseStatus = invitation.responseStatus as keyof typeof INVITATION_RESPONSE_STATUS_LABELS;
      invitationViews.push({
        profileId: invitation.profileId,
        partyName: await this.partyDisplayName(context.businessId, invitation.profileId),
        accessToken: invitation.accessToken,
        responseStatus: invitation.responseStatus,
        responseStatusLabel:
          INVITATION_RESPONSE_STATUS_LABELS[responseStatus] ?? invitation.responseStatus,
        openedAt: invitation.openedAt?.toISOString() ?? null,
        hasSubmitted: supplierQuotes.some((row) => row.status === QUOTE_STATUSES.ACTIVE),
        withdrawn: invitation.responseStatus === INVITATION_RESPONSE_STATUSES.WITHDRAWN,
      });
    }
    const clarifications = await this.mapClarifications(context.businessId, event.id);
    const committeeMembers = (await this.deps.store.listCommitteeMembers(event.id)).map((row) => ({
      id: row.id,
      sequence: row.sequence,
      memberName: row.memberName,
      roleLabel: row.roleLabel,
    }));
    const control = await this.deps.store.getOrCreateControl(context.businessId);
    const bidsReceivedCount = quotedProfileIds.length;
    const countOnlySealedView = commercialSealed && control.bidSubmissionCountVisible;
    const biddingOpen = isBiddingOpen({
      status: event.status,
      closesAt: event.closesAt,
    });
    const issued = event.status === SOURCING_EVENT_STATUSES.ISSUED;
    const closed = event.status === SOURCING_EVENT_STATUSES.CLOSED;
    const evaluating = event.status === SOURCING_EVENT_STATUSES.EVALUATING;
    const dueDiligenceComplete = isDueDiligenceComplete({
      required: event.dueDiligenceRequired,
      locationVerified: event.dueDiligenceLocationVerified,
      staffVerified: event.dueDiligenceStaffVerified,
      legalVerified: event.dueDiligenceLegalVerified,
      recordedAt: event.dueDiligenceRecordedAt,
    });
    const canUpdate = hasPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_UPDATE);
    const canAwardPerm = hasPermission(actor, PROCUREMENT_PERMISSIONS.SOURCING_AWARD);
    const bidsOpened = Boolean(event.bidsOpenedAt);
    const criteriaLocked = Boolean(event.criteriaLockedAt);
    const methodologyExplanation = criteriaLocked
      ? explainEvaluationMethodology({
          evaluationMethod,
          technicalWeight,
          financialWeight,
          phases,
        })
      : null;
    const canExtendBase =
      issued &&
      (control.extensionRequiresApproval ? canAwardPerm : canUpdate);
    const evaluationMethodLabelKey = evaluationMethod as keyof typeof EVALUATION_METHOD_LABELS;
    const openingPolicy = event.openingPolicy as keyof typeof OPENING_POLICY_LABELS;
    const evaluationStage = event.evaluationStage as keyof typeof EVALUATION_STAGE_LABELS;
    return {
      id: event.id,
      eventNumber: event.eventNumber,
      title: event.title,
      rfxType: event.rfxType,
      status: event.status,
      statusLabel: statusLabel(event.status),
      evaluationStage: event.evaluationStage,
      evaluationStageLabel: EVALUATION_STAGE_LABELS[evaluationStage] ?? event.evaluationStage,
      currencyCode: budget.currencyCode,
      budgetedAmount: budget.amount,
      budgetedAmountLabel: formatProcurementMoney(budget.amount, budget.currencyCode),
      purchaseRequestNumbers: budget.purchaseRequestNumbers,
      recommendation: event.recommendation,
      recommendedProfileIds,
      bidsOpenedAt: event.bidsOpenedAt?.toISOString() ?? null,
      comparison,
      commercialSealed,
      bidsReceivedCount,
      bidSubmissionCountVisible: control.bidSubmissionCountVisible,
      invitations: countOnlySealedView ? [] : invitationViews,
      clarifications,
      committeeMembers,
      awards: awardViews,
      closesAt: event.closesAt.toISOString(),
      originalClosesAt: event.originalClosesAt.toISOString(),
      closedAt: event.closedAt?.toISOString() ?? null,
      evaluationStartedAt: event.evaluationStartedAt?.toISOString() ?? null,
      biddingOpen,
      riskLevel: event.riskLevel,
      openingPolicy: event.openingPolicy,
      openingPolicyLabel: OPENING_POLICY_LABELS[openingPolicy] ?? event.openingPolicy,
      openingPolicySource: event.openingPolicySource,
      evaluationMethod: event.evaluationMethod,
      evaluationMethodLabel:
        EVALUATION_METHOD_LABELS[evaluationMethodLabelKey] ?? evaluationMethod,
      technicalWeight,
      financialWeight,
      financialBasis,
      methodologyExplanation,
      criteriaLockedAt: event.criteriaLockedAt?.toISOString() ?? null,
      criteriaSnapshotHash: event.criteriaSnapshotHash,
      lineComparison,
      awardApprovalStatus: event.awardApprovalStatus,
      awardRequiresApproval: control.awardRequiresApproval,
      phases: phases.map((phase) => ({
        phaseCode: phase.phaseCode,
        phaseLabel:
          TECHNICAL_PHASE_LABELS[phase.phaseCode as TechnicalPhaseCode] ?? phase.phaseCode,
        included: phase.included,
        sequence: phase.sequence,
        weight: phase.weight,
        passmark: phase.passmark,
        required: phase.required,
      })),
      dueDiligenceRequired: event.dueDiligenceRequired,
      dueDiligenceLocationVerified: event.dueDiligenceLocationVerified,
      dueDiligenceStaffVerified: event.dueDiligenceStaffVerified,
      dueDiligenceLegalVerified: event.dueDiligenceLegalVerified,
      dueDiligenceOtherNotes: event.dueDiligenceOtherNotes,
      dueDiligenceComplete,
      canCloseTender:
        issued && !biddingOpen && canUpdate && event.evaluationStage === EVALUATION_STAGES.BIDDING,
      canSetupCommittee:
        closed &&
        event.evaluationStage === EVALUATION_STAGES.BIDS_RECEIVED &&
        canUpdate,
      canConfigureCriteria:
        closed &&
        event.evaluationStage === EVALUATION_STAGES.COMMITTEE_SET &&
        !criteriaLocked &&
        canUpdate,
      canLockCriteria:
        closed &&
        event.evaluationStage === EVALUATION_STAGES.CRITERIA_SET &&
        !criteriaLocked &&
        canUpdate,
      canStartEvaluation:
        closed &&
        event.evaluationStage === EVALUATION_STAGES.CRITERIA_LOCKED &&
        criteriaLocked &&
        canUpdate,
      canOpenBids: evaluating && !bidsOpened && canUpdate,
      canRecordPhaseScores: evaluating && bidsOpened && canUpdate,
      openingRequiresChecker: event.openingPolicy === OPENING_POLICIES.MAKER_CHECKER,
      canRecordDueDiligence: evaluating && bidsOpened && canAwardPerm && !dueDiligenceComplete,
      canInvite: biddingOpen && issued && canUpdate,
      canRecordQuote: biddingOpen && issued && canUpdate,
      canAward:
        evaluating &&
        bidsOpened &&
        canAwardPerm &&
        dueDiligenceComplete &&
        event.awardApprovalStatus !== "PENDING",
      canApproveAward:
        evaluating &&
        event.awardApprovalStatus === "PENDING" &&
        canAwardPerm &&
        control.awardRequiresApproval,
      canExtend: canExtendBase,
      extensionRequiresApproval: control.extensionRequiresApproval,
    };
  }

  private async toPortal(token: string, trackOpened: boolean): Promise<SupplierPortalView> {
    const invitation = await this.requireUsableInvitation(token);
    const event = requireEvent(
      await this.deps.store.findEvent(invitation.businessId, invitation.eventId)
    );
    if (trackOpened) {
      await this.deps.store.markInvitationOpened(event.id, invitation.profileId, new Date());
      await this.deps.audit.record({
        businessId: invitation.businessId,
        actorUserId: null,
        entityId: event.id,
        action: PROCUREMENT_AUDIT_ACTIONS.SOURCING_PORTAL_OPENED,
        outcome: "SUCCESS",
        references: { profileId: invitation.profileId },
      });
    }
    const quotes = await this.deps.store.listQuotes(event.id, invitation.profileId);
    const active = activeQuoteVersions(quotes);
    const latest = active[active.length - 1] ?? null;
    const biddingOpen = isBiddingOpen({
      status: event.status,
      closesAt: event.closesAt,
    });
    const ownQuotes = await Promise.all(quotes.map((row) => this.mapQuoteVersion(row)));
    const clarifications = await this.mapClarifications(
      invitation.businessId,
      event.id,
      invitation.profileId
    );
    return {
      eventTitle: event.title,
      eventNumber: event.eventNumber,
      currencyCode: event.currencyCode,
      closesAt: event.closesAt.toISOString(),
      biddingOpen,
      canSubmit: biddingOpen,
      canWithdraw: biddingOpen && active.length > 0,
      ownQuotes,
      currentAmount: latest?.amount ?? null,
      clarifications,
    };
  }

  private async audit(
    context: CurrentBusinessContext,
    entityId: string,
    action: string,
    references: Record<string, string | null | undefined>
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

export function createDefaultSourcingDependencies(): SourcingServiceDependencies {
  const store = createSourcingRepository();
  return {
    store,
    numbering: new ConfigurableDocumentNumberingService(
      createDocumentNumberingPolicyRepository()
    ),
    audit: createProcurementAuditAdapter(),
    approvedRequests: createSourcingBudgetAdapter(),
    suggestedSupplier: createSuggestedSupplierAdapter(),
    workflow: createProcurementSourcingWorkflowAdapter(store),
    notifications: createInProcessNotificationAdapter(),
  };
}

export function createSourcingService(
  deps: SourcingServiceDependencies = createDefaultSourcingDependencies()
) {
  return new SourcingService(deps);
}
