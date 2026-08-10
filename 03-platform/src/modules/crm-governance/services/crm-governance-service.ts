/**
 * Purpose:
 * CRM Governance orchestration — ownership, readiness, merge queue, SLA admin.
 *
 * Architecture note:
 * Keyed by party_id until IP-01 adds crm_record_id. ENG-003l / ENG-003n / ENG-005
 * are local foundations + stubs only.
 *
 * Implementation Package:
 * BP-004 / IP-013 – CRM Governance & Administration
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline";
import { getDb } from "@/db/client";
import { ensureCrmGovernanceDefaults } from "@/db/seeds/crm-governance-defaults-seed";
import {
  CRM_GOVERNANCE_CHANGE_TYPES,
  CRM_GOVERNANCE_KEYING_ARCHITECTURE,
  CRM_GOVERNANCE_LOW_SCORE_THRESHOLD,
  CRM_GOVERNANCE_OWNERSHIP_ROLES,
  CRM_GOVERNANCE_STATUS_CODES,
  CRM_MERGE_PROPOSAL_STATUSES,
} from "@/modules/crm-governance/constants";
import { CRM_GOVERNANCE_CUSTOMER_360_SETTINGS } from "@/modules/crm-governance/customer-360-contribution";
import {
  CRM_GOVERNANCE_USER_MESSAGES,
  CrmGovernanceError,
} from "@/modules/crm-governance/errors";
import { createCrmApprovalMatrixRepository } from "@/modules/crm-governance/repositories/crm-approval-matrix-repository";
import { createCrmBusinessHoursRepository } from "@/modules/crm-governance/repositories/crm-business-hours-repository";
import { createCrmGovernanceChecklistDefinitionRepository } from "@/modules/crm-governance/repositories/crm-governance-checklist-definition-repository";
import { createCrmGovernanceHistoryRepository } from "@/modules/crm-governance/repositories/crm-governance-history-repository";
import { createCrmGovernanceOwnershipHistoryRepository } from "@/modules/crm-governance/repositories/crm-governance-ownership-history-repository";
import { createCrmGovernanceReferenceRepository } from "@/modules/crm-governance/repositories/crm-governance-reference-repository";
import { createCrmGovernanceRepository } from "@/modules/crm-governance/repositories/crm-governance-repository";
import { createCrmHolidayCalendarRepository } from "@/modules/crm-governance/repositories/crm-holiday-calendar-repository";
import { createCrmMergeProposalRepository } from "@/modules/crm-governance/repositories/crm-merge-proposal-repository";
import { createCrmSlaPolicyRepository } from "@/modules/crm-governance/repositories/crm-sla-policy-repository";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  createAuditService,
  recordCrmGovernanceAudit,
} from "@/modules/crm-governance/services/crm-governance-audit-helper";
import {
  buildValidationResults,
  calculateReadinessScore,
  checklistStatusLabel,
  deriveGovernanceStatus,
  evaluateChecklistItem,
  formatReadinessScore,
  governanceStatusLabel,
  isActivationBlocked,
  normalizePartyNameForMatch,
  type CrmChecklistEvaluationResult,
  type CrmGovernanceEvaluationContext,
} from "@/modules/crm-governance/services/crm-governance-rules";
import type {
  CrmApprovalMatrixView,
  CrmBusinessHoursView,
  CrmGovernanceCustomer360SettingsContribution,
  CrmGovernanceDashboardView,
  CrmHolidayView,
  CrmMergeProposalView,
  CrmPartyGovernancePanelView,
  CrmSlaPolicyView,
  DetectCrmDuplicatesPayload,
  MergeProposalActionPayload,
  RunCrmGovernanceValidationPayload,
  ToggleCrmGovernanceLockPayload,
  UpdateCrmGovernanceNotesPayload,
  UpdateCrmGovernanceOwnershipPayload,
  UpsertCrmApprovalMatrixPayload,
  UpsertCrmBusinessHoursPayload,
  UpsertCrmHolidayPayload,
  UpsertCrmSlaPolicyPayload,
} from "@/modules/crm-governance/types";
import {
  detectCrmDuplicatesSchema,
  mergeProposalActionSchema,
  runCrmGovernanceValidationSchema,
  toggleCrmGovernanceLockSchema,
  updateCrmGovernanceNotesSchema,
  updateCrmGovernanceOwnershipSchema,
  upsertCrmApprovalMatrixSchema,
  upsertCrmBusinessHoursSchema,
  upsertCrmHolidaySchema,
  upsertCrmSlaPolicySchema,
} from "@/modules/crm-governance/validators/crm-governance-validators";

function ownerLabel(
  displayName: string | null,
  firstName: string | null,
  lastName: string | null
): string | null {
  const label =
    displayName?.trim() ||
    `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return label || null;
}

export class CrmGovernanceService {
  constructor(
    private readonly governanceRepository = createCrmGovernanceRepository(),
    private readonly historyRepository = createCrmGovernanceHistoryRepository(),
    private readonly ownershipHistoryRepository = createCrmGovernanceOwnershipHistoryRepository(),
    private readonly checklistRepository = createCrmGovernanceChecklistDefinitionRepository(),
    private readonly referenceRepository = createCrmGovernanceReferenceRepository(),
    private readonly mergeRepository = createCrmMergeProposalRepository(),
    private readonly slaRepository = createCrmSlaPolicyRepository(),
    private readonly hoursRepository = createCrmBusinessHoursRepository(),
    private readonly holidayRepository = createCrmHolidayCalendarRepository(),
    private readonly approvalRepository = createCrmApprovalMatrixRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async ensureDefaults(context: CurrentBusinessContext): Promise<void> {
    await ensureCrmGovernanceDefaults(context.businessId, getDb());
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<CrmGovernanceDashboardView> {
    await this.ensureDefaults(context);

    const [
      rows,
      statusCounts,
      pendingMerges,
      slaPolicies,
      businessHours,
      holidays,
      approvalMatrix,
    ] = await Promise.all([
      this.governanceRepository.search(context.businessId),
      this.governanceRepository.countByStatus(context.businessId),
      this.mergeRepository.listByStatus(
        context.businessId,
        CRM_MERGE_PROPOSAL_STATUSES.PENDING
      ),
      this.slaRepository.listByBusiness(context.businessId),
      this.hoursRepository.listByBusiness(context.businessId),
      this.holidayRepository.listByBusiness(context.businessId),
      this.approvalRepository.listByBusiness(context.businessId),
    ]);

    const averageReadiness =
      rows.length === 0
        ? 0
        : Math.round(
            (rows.reduce(
              (sum, row) => sum + Number(row.governance.readinessScore),
              0
            ) /
              rows.length) *
              100
          ) / 100;

    const missingOwners = rows
      .filter((row) => !row.governance.ownerUserId)
      .map((row) => ({
        partyId: row.governance.partyId,
        partyDisplayName: row.partyDisplayName,
        governanceStatus: row.governance.governanceStatus,
        readinessScore: Number(row.governance.readinessScore),
      }));

    const lowScores = rows
      .filter(
        (row) =>
          Number(row.governance.readinessScore) <
          CRM_GOVERNANCE_LOW_SCORE_THRESHOLD
      )
      .map((row) => ({
        partyId: row.governance.partyId,
        partyDisplayName: row.partyDisplayName,
        governanceStatus: row.governance.governanceStatus,
        readinessScore: Number(row.governance.readinessScore),
      }));

    const pendingMergeViews = await Promise.all(
      pendingMerges.map((row) => this.toMergeView(context.businessId, row))
    );

    return {
      governanceCount: rows.length,
      missingOwnersCount: missingOwners.length,
      lowScoresCount: lowScores.length,
      pendingMergesCount: pendingMerges.length,
      averageReadiness,
      slaPolicyCount: slaPolicies.length,
      statusSummary: statusCounts.map((row) => ({
        status: row.status,
        statusLabel: governanceStatusLabel(row.status),
        count: Number(row.count),
      })),
      missingOwners: missingOwners.slice(0, 20),
      lowScores: lowScores.slice(0, 20),
      pendingMerges: pendingMergeViews,
      recentGovernance: rows.slice(0, 10).map((row) => ({
        partyId: row.governance.partyId,
        partyDisplayName: row.partyDisplayName,
        governanceStatus: row.governance.governanceStatus,
        governanceStatusLabel: governanceStatusLabel(
          row.governance.governanceStatus
        ),
        readinessScore: Number(row.governance.readinessScore),
        ownerName: ownerLabel(
          row.ownerDisplayName,
          row.ownerFirstName,
          row.ownerLastName
        ),
      })),
      slaPolicies: slaPolicies.map(this.mapSlaPolicy),
      businessHours: businessHours.map(this.mapBusinessHours),
      holidays: holidays.map(this.mapHoliday),
      approvalMatrix: approvalMatrix.map(this.mapApproval),
    };
  }

  async getPartyGovernancePanel(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmPartyGovernancePanelView> {
    await this.ensureDefaults(context);
    const partyRow = await this.requireParty(context, partyId);

    let governance = await this.governanceRepository.findByPartyId(
      context.businessId,
      partyId
    );

    if (!governance) {
      governance = await this.governanceRepository.insert({
        businessId: context.businessId,
        partyId,
        governanceStatus: CRM_GOVERNANCE_STATUS_CODES.NOT_STARTED,
        readinessScore: "0",
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      });

      await recordCrmGovernanceAudit(this.auditService, context, {
        entityName: AUDIT_ENTITY_NAMES.CRM_GOVERNANCE,
        entityId: governance.id,
        operation: AUDIT_OPERATIONS.CREATE,
        partyId,
        createValues: governance as unknown as Record<string, unknown>,
      });
    }

    const evaluation = await this.evaluateGovernance(
      context.businessId,
      partyRow,
      governance
    );

    const [ownerOptions, history, ownershipHistory] = await Promise.all([
      this.referenceRepository.listOwnerOptions(context.businessId),
      this.historyRepository.listByGovernanceId(
        context.businessId,
        governance.id
      ),
      this.ownershipHistoryRepository.listByGovernanceId(
        context.businessId,
        governance.id
      ),
    ]);

    const [ownerName, rmName, stewardName] = await Promise.all([
      governance.ownerUserId
        ? this.referenceRepository.getOwnerDisplayName(governance.ownerUserId)
        : null,
      governance.relationshipManagerUserId
        ? this.referenceRepository.getOwnerDisplayName(
            governance.relationshipManagerUserId
          )
        : null,
      governance.stewardUserId
        ? this.referenceRepository.getOwnerDisplayName(governance.stewardUserId)
        : null,
    ]);

    const ownershipHistoryViews = await Promise.all(
      ownershipHistory.map(async (row) => ({
        id: row.id,
        roleCode: row.roleCode,
        userId: row.userId,
        userName: await this.referenceRepository.getOwnerDisplayName(row.userId),
        effectiveFrom: row.effectiveFrom.toISOString(),
        effectiveTo: row.effectiveTo?.toISOString() ?? null,
      }))
    );

    const isArchived =
      governance.governanceStatus === CRM_GOVERNANCE_STATUS_CODES.ARCHIVED;

    return {
      partyId,
      partyDisplayName: partyRow.displayName,
      governanceId: governance.id,
      governanceStatus: governance.governanceStatus,
      governanceStatusLabel: governanceStatusLabel(governance.governanceStatus),
      readinessScore: evaluation.score,
      readinessScoreLabel: formatReadinessScore(evaluation.score),
      lastValidationDate: governance.lastValidationDate?.toISOString() ?? null,
      isLocked: governance.isLocked,
      activationBlocked: governance.activationBlocked,
      notes: governance.notes,
      ownerUserId: governance.ownerUserId,
      ownerName,
      relationshipManagerUserId: governance.relationshipManagerUserId,
      relationshipManagerName: rmName,
      stewardUserId: governance.stewardUserId,
      stewardName,
      ownerOptions,
      statusOptions: Object.values(CRM_GOVERNANCE_STATUS_CODES).map((code) => ({
        code,
        name: governanceStatusLabel(code),
      })),
      checklist: evaluation.checklist.map((item) => this.mapChecklistView(item)),
      validationResults: buildValidationResults(evaluation.checklist).map(
        (item) => ({
          ...item,
          statusLabel: checklistStatusLabel(item.status),
        })
      ),
      history: history.map((row) => ({
        id: row.id,
        changeType: row.changeType,
        changeTypeLabel: this.changeTypeLabel(row.changeType),
        oldValue: row.oldValue,
        newValue: row.newValue,
        changedBy: row.changedBy,
        changeDate: row.changeDate.toISOString(),
      })),
      ownershipHistory: ownershipHistoryViews,
      editable: !governance.isLocked && !isArchived,
      architectureNote: CRM_GOVERNANCE_KEYING_ARCHITECTURE.note,
    };
  }

  async updateOwnership(
    context: CurrentBusinessContext,
    payload: UpdateCrmGovernanceOwnershipPayload
  ): Promise<CrmPartyGovernancePanelView> {
    const parsed = updateCrmGovernanceOwnershipSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    await this.requireParty(context, parsed.data.partyId);
    const governance = await this.requireGovernance(
      context,
      parsed.data.partyId
    );
    this.assertEditable(governance);

    const ownerUserId = parsed.data.ownerUserId?.trim() || null;
    const relationshipManagerUserId =
      parsed.data.relationshipManagerUserId?.trim() || null;
    const stewardUserId = parsed.data.stewardUserId?.trim() || null;

    await this.assertAssignable(context, ownerUserId);
    await this.assertAssignable(context, relationshipManagerUserId);
    await this.assertAssignable(context, stewardUserId);

    const now = new Date();
    await this.recordOwnershipChange(
      context,
      governance.id,
      CRM_GOVERNANCE_OWNERSHIP_ROLES.OWNER,
      governance.ownerUserId,
      ownerUserId,
      now
    );
    await this.recordOwnershipChange(
      context,
      governance.id,
      CRM_GOVERNANCE_OWNERSHIP_ROLES.RELATIONSHIP_MANAGER,
      governance.relationshipManagerUserId,
      relationshipManagerUserId,
      now
    );
    await this.recordOwnershipChange(
      context,
      governance.id,
      CRM_GOVERNANCE_OWNERSHIP_ROLES.STEWARD,
      governance.stewardUserId,
      stewardUserId,
      now
    );

    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        ownerUserId,
        relationshipManagerUserId,
        stewardUserId,
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new CrmGovernanceError(
        "NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (governance.ownerUserId !== updated.ownerUserId) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: CRM_GOVERNANCE_CHANGE_TYPES.OWNER_CHANGED,
        oldValue: governance.ownerUserId,
        newValue: updated.ownerUserId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_OWNER_CHANGED,
        summary: "CRM governance owner changed.",
      });
    }

    if (
      governance.relationshipManagerUserId !==
      updated.relationshipManagerUserId
    ) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: CRM_GOVERNANCE_CHANGE_TYPES.RELATIONSHIP_MANAGER_CHANGED,
        oldValue: governance.relationshipManagerUserId,
        newValue: updated.relationshipManagerUserId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_OWNER_CHANGED,
        summary: "CRM relationship manager changed.",
      });
    }

    if (governance.stewardUserId !== updated.stewardUserId) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: CRM_GOVERNANCE_CHANGE_TYPES.STEWARD_CHANGED,
        oldValue: governance.stewardUserId,
        newValue: updated.stewardUserId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_OWNER_CHANGED,
        summary: "CRM steward changed.",
      });
    }

    await recordCrmGovernanceAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_GOVERNANCE,
      entityId: updated.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      partyId: parsed.data.partyId,
      before: governance as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return this.runValidation(context, { partyId: parsed.data.partyId });
  }

  async updateNotes(
    context: CurrentBusinessContext,
    payload: UpdateCrmGovernanceNotesPayload
  ): Promise<CrmPartyGovernancePanelView> {
    const parsed = updateCrmGovernanceNotesSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const governance = await this.requireGovernance(
      context,
      parsed.data.partyId
    );
    this.assertEditable(governance);

    const notes = parsed.data.notes?.trim() || null;
    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      { notes, updatedBy: context.platformUserId }
    );

    if (!updated) {
      throw new CrmGovernanceError(
        "NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (governance.notes !== updated.notes) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: CRM_GOVERNANCE_CHANGE_TYPES.NOTES_CHANGED,
        oldValue: governance.notes,
        newValue: updated.notes,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATED,
        summary: "Governance notes updated.",
      });
    }

    return this.getPartyGovernancePanel(context, parsed.data.partyId);
  }

  async toggleLock(
    context: CurrentBusinessContext,
    payload: ToggleCrmGovernanceLockPayload
  ): Promise<CrmPartyGovernancePanelView> {
    const parsed = toggleCrmGovernanceLockSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const governance = await this.requireGovernance(
      context,
      parsed.data.partyId
    );

    if (
      governance.governanceStatus === CRM_GOVERNANCE_STATUS_CODES.ARCHIVED
    ) {
      throw new CrmGovernanceError(
        "GOVERNANCE_IMMUTABLE",
        CRM_GOVERNANCE_USER_MESSAGES.GOVERNANCE_IMMUTABLE,
        409
      );
    }

    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        isLocked: parsed.data.isLocked,
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new CrmGovernanceError(
        "NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await this.recordHistoryAndTimeline(context, updated, {
      changeType: CRM_GOVERNANCE_CHANGE_TYPES.LOCK_CHANGED,
      oldValue: String(governance.isLocked),
      newValue: String(updated.isLocked),
      eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_LOCKED,
      summary: updated.isLocked
        ? "Governance locked pending approval."
        : "Governance unlocked.",
    });

    return this.runValidation(context, { partyId: parsed.data.partyId });
  }

  async runValidation(
    context: CurrentBusinessContext,
    payload: RunCrmGovernanceValidationPayload
  ): Promise<CrmPartyGovernancePanelView> {
    const parsed = runCrmGovernanceValidationSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const partyRow = await this.requireParty(context, parsed.data.partyId);
    const governance = await this.requireGovernance(
      context,
      parsed.data.partyId
    );

    const evaluation = await this.evaluateGovernance(
      context.businessId,
      partyRow,
      governance
    );

    const nextStatus = deriveGovernanceStatus(
      governance.isLocked,
      evaluation.score,
      evaluation.checklist,
      Boolean(governance.ownerUserId),
      governance.governanceStatus === CRM_GOVERNANCE_STATUS_CODES.ARCHIVED
    );

    const activationBlocked = isActivationBlocked(
      evaluation.score,
      evaluation.checklist
    );

    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        readinessScore: evaluation.score.toFixed(2),
        governanceStatus: nextStatus,
        lastValidationDate: new Date(),
        activationBlocked,
        metadata: {
          checklist: evaluation.checklist.map((item) => ({
            code: item.code,
            status: item.status,
          })),
        },
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new CrmGovernanceError(
        "NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (Number(governance.readinessScore) !== Number(updated.readinessScore)) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: CRM_GOVERNANCE_CHANGE_TYPES.READINESS_CHANGED,
        oldValue: governance.readinessScore,
        newValue: updated.readinessScore,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATED,
        summary: `Readiness updated to ${formatReadinessScore(evaluation.score)}.`,
      });
    }

    if (governance.governanceStatus !== updated.governanceStatus) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: CRM_GOVERNANCE_CHANGE_TYPES.STATUS_CHANGED,
        oldValue: governance.governanceStatus,
        newValue: updated.governanceStatus,
        eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATED,
        summary: `Governance status changed to ${governanceStatusLabel(updated.governanceStatus)}.`,
      });
    }

    await this.recordHistoryAndTimeline(context, updated, {
      changeType: CRM_GOVERNANCE_CHANGE_TYPES.VALIDATION_EXECUTED,
      oldValue: null,
      newValue: formatReadinessScore(evaluation.score),
      eventType: PARTY_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATED,
      summary: "Governance validation executed.",
    });

    await recordCrmGovernanceAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_GOVERNANCE,
      entityId: updated.id,
      operation: AUDIT_OPERATIONS.VERIFY,
      partyId: parsed.data.partyId,
      before: governance as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return this.getPartyGovernancePanel(context, parsed.data.partyId);
  }

  async detectDuplicates(
    context: CurrentBusinessContext,
    payload: DetectCrmDuplicatesPayload
  ): Promise<CrmMergeProposalView[]> {
    const parsed = detectCrmDuplicatesSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const partyRow = await this.requireParty(context, parsed.data.partyId);
    const candidates = await this.referenceRepository.findSimilarParties(
      context.businessId,
      parsed.data.partyId,
      partyRow.displayName
    );

    const created: CrmMergeProposalView[] = [];
    const normalizedSource = normalizePartyNameForMatch(partyRow.displayName);

    for (const candidate of candidates) {
      const normalizedCandidate = normalizePartyNameForMatch(
        candidate.displayName
      );
      if (
        normalizedCandidate !== normalizedSource &&
        !normalizedCandidate.includes(normalizedSource) &&
        !normalizedSource.includes(normalizedCandidate)
      ) {
        continue;
      }

      const existing = await this.mergeRepository.findPendingPair(
        context.businessId,
        parsed.data.partyId,
        candidate.id
      );
      if (existing) {
        created.push(await this.toMergeView(context.businessId, existing));
        continue;
      }

      const proposal = await this.mergeRepository.insert({
        businessId: context.businessId,
        survivorPartyId: parsed.data.partyId,
        duplicatePartyId: candidate.id,
        status: CRM_MERGE_PROPOSAL_STATUSES.PENDING,
        matchReason: `Similar display name: "${candidate.displayName}"`,
        proposedBy: context.platformUserId,
      });

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: parsed.data.partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.MERGE_PROPOSED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_GOVERNANCE,
          summary: `Merge proposed with ${candidate.displayName}`,
          referenceEntity: "crm_merge_proposal",
          referenceId: proposal.id,
        })
      );

      await recordCrmGovernanceAudit(this.auditService, context, {
        entityName: AUDIT_ENTITY_NAMES.CRM_MERGE_PROPOSAL,
        entityId: proposal.id,
        operation: AUDIT_OPERATIONS.CREATE,
        partyId: parsed.data.partyId,
        createValues: proposal as unknown as Record<string, unknown>,
      });

      created.push(await this.toMergeView(context.businessId, proposal));
    }

    return created;
  }

  async approveMergeProposal(
    context: CurrentBusinessContext,
    payload: MergeProposalActionPayload
  ): Promise<CrmMergeProposalView> {
    return this.transitionMerge(
      context,
      payload,
      CRM_MERGE_PROPOSAL_STATUSES.PENDING,
      CRM_MERGE_PROPOSAL_STATUSES.APPROVED
    );
  }

  async rejectMergeProposal(
    context: CurrentBusinessContext,
    payload: MergeProposalActionPayload
  ): Promise<CrmMergeProposalView> {
    return this.transitionMerge(
      context,
      payload,
      CRM_MERGE_PROPOSAL_STATUSES.PENDING,
      CRM_MERGE_PROPOSAL_STATUSES.REJECTED
    );
  }

  async executeMergeProposal(
    context: CurrentBusinessContext,
    payload: MergeProposalActionPayload
  ): Promise<CrmMergeProposalView> {
    const parsed = mergeProposalActionSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const proposal = await this.mergeRepository.findById(
      context.businessId,
      parsed.data.proposalId
    );
    if (!proposal) {
      throw new CrmGovernanceError(
        "MERGE_NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.MERGE_NOT_FOUND,
        404
      );
    }
    if (proposal.status !== CRM_MERGE_PROPOSAL_STATUSES.APPROVED) {
      throw new CrmGovernanceError(
        "MERGE_INVALID_STATUS",
        CRM_GOVERNANCE_USER_MESSAGES.MERGE_INVALID_STATUS,
        409
      );
    }

    const updated = await this.mergeRepository.updateById(
      context.businessId,
      proposal.id,
      {
        status: CRM_MERGE_PROPOSAL_STATUSES.EXECUTED,
        executedAt: new Date(),
        notes: parsed.data.notes?.trim() || proposal.notes,
        metadata: {
          ...(typeof proposal.metadata === "object" && proposal.metadata
            ? (proposal.metadata as Record<string, unknown>)
            : {}),
          executedNote:
            "Local stub: parties not deleted. BP-002 owns party merge mechanics.",
        },
      }
    );

    if (!updated) {
      throw new CrmGovernanceError(
        "MERGE_NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.MERGE_NOT_FOUND,
        404
      );
    }

    await recordCrmGovernanceAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_MERGE_PROPOSAL,
      entityId: updated.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      partyId: updated.survivorPartyId,
      before: proposal as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return this.toMergeView(context.businessId, updated);
  }

  async listSlaPolicies(context: CurrentBusinessContext) {
    await this.ensureDefaults(context);
    const rows = await this.slaRepository.listByBusiness(context.businessId);
    return rows.map(this.mapSlaPolicy);
  }

  async upsertSlaPolicy(
    context: CurrentBusinessContext,
    payload: UpsertCrmSlaPolicyPayload
  ): Promise<CrmSlaPolicyView> {
    const parsed = upsertCrmSlaPolicySchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const priorityCode =
      parsed.data.priorityCode === "" || parsed.data.priorityCode === undefined
        ? null
        : parsed.data.priorityCode;

    let row;
    if (parsed.data.id) {
      row = await this.slaRepository.updateById(
        context.businessId,
        parsed.data.id,
        {
          businessId: context.businessId,
          entityTypeCode: parsed.data.entityTypeCode,
          priorityCode,
          name: parsed.data.name,
          firstResponseTargetHours: parsed.data.firstResponseTargetHours ?? null,
          resolutionTargetHours: parsed.data.resolutionTargetHours,
          pauseReasonCodes: parsed.data.pauseReasonCodes ?? [],
          escalationEnabled: parsed.data.escalationEnabled ?? true,
          isActive: parsed.data.isActive ?? true,
        }
      );
    } else {
      row = await this.slaRepository.insert({
        businessId: context.businessId,
        entityTypeCode: parsed.data.entityTypeCode,
        priorityCode,
        name: parsed.data.name,
        firstResponseTargetHours: parsed.data.firstResponseTargetHours ?? null,
        resolutionTargetHours: parsed.data.resolutionTargetHours,
        pauseReasonCodes: parsed.data.pauseReasonCodes ?? [],
        escalationEnabled: parsed.data.escalationEnabled ?? true,
        isActive: parsed.data.isActive ?? true,
      });
    }

    if (!row) {
      throw new CrmGovernanceError(
        "SLA_INVALID",
        CRM_GOVERNANCE_USER_MESSAGES.SLA_INVALID,
        400
      );
    }

    await recordCrmGovernanceAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_SLA_POLICY,
      entityId: row.id,
      operation: parsed.data.id
        ? AUDIT_OPERATIONS.UPDATE
        : AUDIT_OPERATIONS.CREATE,
      createValues: row as unknown as Record<string, unknown>,
    });

    return this.mapSlaPolicy(row);
  }

  async listBusinessHours(context: CurrentBusinessContext) {
    await this.ensureDefaults(context);
    const rows = await this.hoursRepository.listByBusiness(context.businessId);
    return rows.map(this.mapBusinessHours);
  }

  async upsertBusinessHours(
    context: CurrentBusinessContext,
    payload: UpsertCrmBusinessHoursPayload
  ): Promise<CrmBusinessHoursView> {
    const parsed = upsertCrmBusinessHoursSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const row = await this.hoursRepository.upsertDay(context.businessId, {
      dayOfWeek: parsed.data.dayOfWeek,
      openTime: parsed.data.openTime,
      closeTime: parsed.data.closeTime,
      isClosed: parsed.data.isClosed,
      timezone: parsed.data.timezone,
    });

    return this.mapBusinessHours(row!);
  }

  async listHolidays(context: CurrentBusinessContext) {
    await this.ensureDefaults(context);
    const rows = await this.holidayRepository.listByBusiness(context.businessId);
    return rows.map(this.mapHoliday);
  }

  async upsertHoliday(
    context: CurrentBusinessContext,
    payload: UpsertCrmHolidayPayload
  ): Promise<CrmHolidayView> {
    const parsed = upsertCrmHolidaySchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const row = await this.holidayRepository.upsert(context.businessId, {
      id: parsed.data.id,
      holidayDate: parsed.data.holidayDate,
      name: parsed.data.name,
      isRecurring: parsed.data.isRecurring,
    });

    return this.mapHoliday(row!);
  }

  async listApprovalMatrix(context: CurrentBusinessContext) {
    await this.ensureDefaults(context);
    const rows = await this.approvalRepository.listByBusiness(
      context.businessId
    );
    return rows.map(this.mapApproval);
  }

  async upsertApprovalMatrixEntry(
    context: CurrentBusinessContext,
    payload: UpsertCrmApprovalMatrixPayload
  ): Promise<CrmApprovalMatrixView> {
    const parsed = upsertCrmApprovalMatrixSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const row = await this.approvalRepository.upsert(context.businessId, {
      id: parsed.data.id,
      actionCode: parsed.data.actionCode,
      minRoleCode: parsed.data.minRoleCode,
      requiresDualApproval: parsed.data.requiresDualApproval,
      isActive: parsed.data.isActive,
    });

    return this.mapApproval(row!);
  }

  getCustomer360SettingsContribution(): CrmGovernanceCustomer360SettingsContribution {
    return {
      settingsContributionIds: CRM_GOVERNANCE_CUSTOMER_360_SETTINGS.map(
        (item) => item.id
      ),
      note: "Settings tab contributions only — not Customer 360 hub widgets. Governed subject is party_id until IP-01 adds crm_record_id.",
    };
  }

  private async transitionMerge(
    context: CurrentBusinessContext,
    payload: MergeProposalActionPayload,
    expectedStatus: string,
    nextStatus: string
  ): Promise<CrmMergeProposalView> {
    const parsed = mergeProposalActionSchema.safeParse(payload);
    if (!parsed.success) {
      throw this.invalidInput(parsed.error.issues[0]?.message);
    }

    const proposal = await this.mergeRepository.findById(
      context.businessId,
      parsed.data.proposalId
    );
    if (!proposal) {
      throw new CrmGovernanceError(
        "MERGE_NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.MERGE_NOT_FOUND,
        404
      );
    }
    if (proposal.status !== expectedStatus) {
      throw new CrmGovernanceError(
        "MERGE_INVALID_STATUS",
        CRM_GOVERNANCE_USER_MESSAGES.MERGE_INVALID_STATUS,
        409
      );
    }

    const updated = await this.mergeRepository.updateById(
      context.businessId,
      proposal.id,
      {
        status: nextStatus,
        reviewedBy: context.platformUserId,
        reviewedAt: new Date(),
        notes: parsed.data.notes?.trim() || proposal.notes,
      }
    );

    if (!updated) {
      throw new CrmGovernanceError(
        "MERGE_NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.MERGE_NOT_FOUND,
        404
      );
    }

    await recordCrmGovernanceAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.CRM_MERGE_PROPOSAL,
      entityId: updated.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      partyId: updated.survivorPartyId,
      before: proposal as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return this.toMergeView(context.businessId, updated);
  }

  private async evaluateGovernance(
    businessId: string,
    partyRow: { id: string; displayName: string; statusCode: string },
    governance: NonNullable<
      Awaited<ReturnType<CrmGovernanceRepository["findByPartyId"]>>
    >
  ) {
    const [definitions, activityCount, overdueOpenCaseCount] =
      await Promise.all([
        this.checklistRepository.listActiveByBusinessId(businessId),
        this.referenceRepository.countActivitiesForParty(
          businessId,
          partyRow.id
        ),
        this.referenceRepository.countOverdueOpenCasesForParty(
          businessId,
          partyRow.id
        ),
      ]);

    const evaluationContext: CrmGovernanceEvaluationContext = {
      partyDisplayName: partyRow.displayName,
      ownerUserId: governance.ownerUserId,
      relationshipManagerUserId: governance.relationshipManagerUserId,
      stewardUserId: governance.stewardUserId,
      activityCount,
      overdueOpenCaseCount,
      isArchived:
        governance.governanceStatus === CRM_GOVERNANCE_STATUS_CODES.ARCHIVED,
    };

    const checklist = definitions.map((definition) =>
      evaluateChecklistItem(definition.evaluatorKey, definition, evaluationContext)
    );
    const score = calculateReadinessScore(checklist);
    return { checklist, score };
  }

  private mapChecklistView(item: CrmChecklistEvaluationResult) {
    return {
      code: item.code,
      name: item.name,
      description: item.description,
      sourceModule: item.sourceModule,
      isMandatory: item.isMandatory,
      weight: item.weight,
      displayOrder: item.displayOrder,
      status: item.status,
      statusLabel: item.statusLabel,
      detail: item.detail,
      isPendingExternalModule: item.isPendingExternalModule,
    };
  }

  private mapSlaPolicy = (row: {
    id: string;
    entityTypeCode: string;
    priorityCode: string | null;
    name: string;
    firstResponseTargetHours: number | null;
    resolutionTargetHours: number;
    pauseReasonCodes: unknown;
    escalationEnabled: boolean;
    isActive: boolean;
  }): CrmSlaPolicyView => ({
    id: row.id,
    entityTypeCode: row.entityTypeCode,
    priorityCode: row.priorityCode,
    name: row.name,
    firstResponseTargetHours: row.firstResponseTargetHours,
    resolutionTargetHours: row.resolutionTargetHours,
    pauseReasonCodes: Array.isArray(row.pauseReasonCodes)
      ? (row.pauseReasonCodes as string[])
      : [],
    escalationEnabled: row.escalationEnabled,
    isActive: row.isActive,
  });

  private mapBusinessHours = (row: {
    id: string;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
    timezone: string;
  }): CrmBusinessHoursView => ({
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    openTime: row.openTime,
    closeTime: row.closeTime,
    isClosed: row.isClosed,
    timezone: row.timezone,
  });

  private mapHoliday = (row: {
    id: string;
    holidayDate: string;
    name: string;
    isRecurring: boolean;
  }): CrmHolidayView => ({
    id: row.id,
    holidayDate: row.holidayDate,
    name: row.name,
    isRecurring: row.isRecurring,
  });

  private mapApproval = (row: {
    id: string;
    actionCode: string;
    minRoleCode: string;
    requiresDualApproval: boolean;
    isActive: boolean;
  }): CrmApprovalMatrixView => ({
    id: row.id,
    actionCode: row.actionCode,
    minRoleCode: row.minRoleCode,
    requiresDualApproval: row.requiresDualApproval,
    isActive: row.isActive,
  });

  private async toMergeView(
    businessId: string,
    row: {
      id: string;
      survivorPartyId: string;
      duplicatePartyId: string;
      status: string;
      matchReason: string | null;
      proposedBy: string | null;
      reviewedBy: string | null;
      reviewedAt: Date | null;
      executedAt: Date | null;
      notes: string | null;
      createdAt: Date;
    }
  ): Promise<CrmMergeProposalView> {
    const [survivor, duplicate] = await Promise.all([
      this.referenceRepository.findParty(businessId, row.survivorPartyId),
      this.referenceRepository.findParty(businessId, row.duplicatePartyId),
    ]);

    return {
      id: row.id,
      survivorPartyId: row.survivorPartyId,
      survivorPartyName: survivor?.displayName ?? null,
      duplicatePartyId: row.duplicatePartyId,
      duplicatePartyName: duplicate?.displayName ?? null,
      status: row.status,
      matchReason: row.matchReason,
      proposedBy: row.proposedBy,
      reviewedBy: row.reviewedBy,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      executedAt: row.executedAt?.toISOString() ?? null,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private changeTypeLabel(changeType: string): string {
    switch (changeType) {
      case CRM_GOVERNANCE_CHANGE_TYPES.OWNER_CHANGED:
        return "Owner Changed";
      case CRM_GOVERNANCE_CHANGE_TYPES.RELATIONSHIP_MANAGER_CHANGED:
        return "Relationship Manager Changed";
      case CRM_GOVERNANCE_CHANGE_TYPES.STEWARD_CHANGED:
        return "Steward Changed";
      case CRM_GOVERNANCE_CHANGE_TYPES.STATUS_CHANGED:
        return "Status Changed";
      case CRM_GOVERNANCE_CHANGE_TYPES.READINESS_CHANGED:
        return "Readiness Changed";
      case CRM_GOVERNANCE_CHANGE_TYPES.VALIDATION_EXECUTED:
        return "Validation Executed";
      case CRM_GOVERNANCE_CHANGE_TYPES.LOCK_CHANGED:
        return "Lock Changed";
      case CRM_GOVERNANCE_CHANGE_TYPES.NOTES_CHANGED:
        return "Notes Changed";
      default:
        return changeType;
    }
  }

  private async recordOwnershipChange(
    context: CurrentBusinessContext,
    governanceId: string,
    roleCode: string,
    previousUserId: string | null,
    nextUserId: string | null,
    now: Date
  ) {
    if (previousUserId === nextUserId) {
      return;
    }

    if (previousUserId) {
      await this.ownershipHistoryRepository.closeOpenAssignment(
        context.businessId,
        governanceId,
        roleCode,
        now
      );
    }

    if (nextUserId) {
      await this.ownershipHistoryRepository.insert({
        businessId: context.businessId,
        governanceId,
        roleCode,
        userId: nextUserId,
        effectiveFrom: now,
        changedBy: context.platformUserId,
      });
    }
  }

  private async recordHistoryAndTimeline(
    context: CurrentBusinessContext,
    governance: { id: string; partyId: string },
    input: {
      changeType: string;
      oldValue: string | null;
      newValue: string | null;
      eventType: (typeof PARTY_TIMELINE_EVENT_TYPES)[keyof typeof PARTY_TIMELINE_EVENT_TYPES];
      summary: string;
    }
  ) {
    await this.historyRepository.insert({
      businessId: context.businessId,
      crmGovernanceId: governance.id,
      changeType: input.changeType,
      oldValue: input.oldValue,
      newValue: input.newValue,
      changedBy: context.platformUserId,
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: governance.partyId,
        eventType: input.eventType,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_GOVERNANCE,
        summary: input.summary,
        referenceEntity: "crm_governance",
        referenceId: governance.id,
        metadata: { changeType: input.changeType },
      })
    );
  }

  private async assertAssignable(
    context: CurrentBusinessContext,
    userId: string | null
  ) {
    if (!userId) {
      return;
    }
    const ok = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      userId
    );
    if (!ok) {
      throw new CrmGovernanceError(
        "USER_NOT_ASSIGNABLE",
        CRM_GOVERNANCE_USER_MESSAGES.USER_NOT_ASSIGNABLE,
        400,
        "ownerUserId"
      );
    }
  }

  private assertEditable(governance: {
    isLocked: boolean;
    governanceStatus: string;
  }) {
    if (governance.governanceStatus === CRM_GOVERNANCE_STATUS_CODES.ARCHIVED) {
      throw new CrmGovernanceError(
        "GOVERNANCE_IMMUTABLE",
        CRM_GOVERNANCE_USER_MESSAGES.GOVERNANCE_IMMUTABLE,
        409
      );
    }
    if (governance.isLocked) {
      throw new CrmGovernanceError(
        "GOVERNANCE_LOCKED",
        CRM_GOVERNANCE_USER_MESSAGES.GOVERNANCE_LOCKED,
        409
      );
    }
  }

  private async requireGovernance(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    let governance = await this.governanceRepository.findByPartyId(
      context.businessId,
      partyId
    );
    if (!governance) {
      await this.getPartyGovernancePanel(context, partyId);
      governance = await this.governanceRepository.findByPartyId(
        context.businessId,
        partyId
      );
    }
    if (!governance) {
      throw new CrmGovernanceError(
        "NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.NOT_FOUND,
        404
      );
    }
    return governance;
  }

  private async requireParty(
    context: CurrentBusinessContext,
    partyId: string
  ) {
    const partyRow = await this.referenceRepository.findParty(
      context.businessId,
      partyId
    );
    if (!partyRow) {
      throw new CrmGovernanceError(
        "PARTY_NOT_FOUND",
        CRM_GOVERNANCE_USER_MESSAGES.PARTY_NOT_FOUND,
        404,
        "partyId"
      );
    }
    return partyRow;
  }

  private invalidInput(message?: string) {
    return new CrmGovernanceError(
      "INVALID_INPUT",
      message ?? CRM_GOVERNANCE_USER_MESSAGES.INVALID_INPUT,
      400
    );
  }
}

type CrmGovernanceRepository = ReturnType<typeof createCrmGovernanceRepository>;

export function createCrmGovernanceService() {
  return new CrmGovernanceService();
}
