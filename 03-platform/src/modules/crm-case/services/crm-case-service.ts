/**
 * CRM Case orchestration — BP-004 / IP-09
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createAuditService } from "@/core/audit";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline";
import { getDb } from "@/db/client";
import {
  CRM_ACTIVITY_ENTITY_TYPE_CODES,
  CRM_ACTIVITY_RECORD_SOURCE_CODES,
  CRM_ACTIVITY_TYPE_CODES,
} from "@/modules/crm-activity/constants";
import { createCrmActivityService } from "@/modules/crm-activity/services/crm-activity-service";
import {
  CRM_CASE_ESCALATION_TRIGGERED_BY,
  CRM_CASE_OPEN_STATUS_CODES,
  CRM_CASE_PRIORITY_CODES,
  CRM_CASE_PRIORITY_LABELS,
  CRM_CASE_SEVERITY_CODES,
  CRM_CASE_SEVERITY_LABELS,
  CRM_CASE_SLA_PAUSE_REASON_CODES,
  CRM_CASE_STATUS_CODES,
  CRM_CASE_STATUS_LABELS,
  CRM_CASE_TYPE_CODES,
  CRM_CASE_TYPE_LABELS,
  CRM_CASE_ENTITY_TYPE_CODES,
  type CrmCasePriorityCode,
  type CrmCaseSeverityCode,
  type CrmCaseStatusCode,
  type CrmCaseTypeCode,
} from "@/modules/crm-case/constants";
import { CRM_CASE_USER_MESSAGES, CrmCaseError } from "@/modules/crm-case/errors";
import { createCrmCaseCatalogueRepository } from "@/modules/crm-case/repositories/crm-case-catalogue-repository";
import { createCrmCaseEntityLinkRepository } from "@/modules/crm-case/repositories/crm-case-entity-link-repository";
import { createCrmCaseEscalationRepository } from "@/modules/crm-case/repositories/crm-case-escalation-repository";
import { createCrmCaseReferenceRepository } from "@/modules/crm-case/repositories/crm-case-reference-repository";
import { createCrmCaseRepository } from "@/modules/crm-case/repositories/crm-case-repository";
import { createCrmSlaPolicyRepository } from "@/modules/crm-governance/repositories/crm-sla-policy-repository";
import {
  AUDIT_OPERATIONS,
  recordCrmCaseAudit,
} from "@/modules/crm-case/services/crm-case-audit-helper";
import {
  assertTransition,
  buildCaseNumber,
  computeSlaDueDates,
  computeSlaRemainingMs,
  isCaseEditable,
  isOverdue,
  isSlaAtRisk,
  isSlaBreached,
} from "@/modules/crm-case/services/crm-case-rules";
import type {
  AssignCrmCasePayload,
  CloseCrmCasePayload,
  CreateCrmCasePayload,
  CrmCaseCustomer360Contribution,
  CrmCaseDashboardView,
  CrmCaseDetailView,
  CrmCaseListFilters,
  CrmCaseRegistrationCatalogues,
  CrmCaseSummaryView,
  EscalateCrmCasePayload,
  ReopenCrmCasePayload,
  ResolveCrmCasePayload,
  SetPendingCustomerPayload,
  UpdateCrmCasePayload,
} from "@/modules/crm-case/types";
import {
  assignCrmCaseSchema,
  closeCrmCaseSchema,
  createCrmCaseSchema,
  crmCaseListFiltersSchema,
  escalateCrmCaseSchema,
  reopenCrmCaseSchema,
  resolveCrmCaseSchema,
  setPendingCustomerSchema,
  updateCrmCaseSchema,
} from "@/modules/crm-case/validators/crm-case-validators";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";

type CaseRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createCrmCaseRepository>["findById"]>>
>;

export class CrmCaseService {
  constructor(
    private readonly caseRepository = createCrmCaseRepository(),
    private readonly entityLinkRepository = createCrmCaseEntityLinkRepository(),
    private readonly escalationRepository = createCrmCaseEscalationRepository(),
    private readonly catalogueRepository = createCrmCaseCatalogueRepository(),
    private readonly referenceRepository = createCrmCaseReferenceRepository(),
    private readonly slaPolicyRepository = createCrmSlaPolicyRepository(),
    private readonly partyRepository = createPartyRepository(),
    private readonly activityService = createCrmActivityService(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<CrmCaseRegistrationCatalogues> {
    await this.catalogueRepository.ensureDefaults();
    const [owners, caseTypes, priorities, severities, resolutionCodes, statuses] =
      await Promise.all([
        this.referenceRepository.listActiveOwners(context.businessId),
        this.catalogueRepository.listActiveTypes(),
        this.catalogueRepository.listActivePriorities(),
        this.catalogueRepository.listActiveSeverities(),
        this.catalogueRepository.listActiveResolutionCodes(),
        this.catalogueRepository.listActiveStatuses(),
      ]);
    return {
      caseTypes,
      priorities,
      severities,
      resolutionCodes,
      statuses,
      owners: owners.map((row) => ({
        id: row.id,
        displayName:
          row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
      })),
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<CrmCaseDashboardView> {
    const [openCount, escalatedCount, overdueCount, unassignedCount, recentRows] =
      await Promise.all([
        this.caseRepository.countByStatus(context.businessId, [
          ...CRM_CASE_OPEN_STATUS_CODES,
        ]),
        this.caseRepository.countByStatus(context.businessId, [
          CRM_CASE_STATUS_CODES.ESCALATED,
        ]),
        this.caseRepository.countOverdue(context.businessId),
        this.caseRepository.countUnassigned(context.businessId),
        this.caseRepository.listRecent(context.businessId, 10),
      ]);

    return {
      openCount,
      escalatedCount,
      overdueCount,
      unassignedCount,
      recentCases: await Promise.all(
        recentRows.map((row) => this.toSummaryView(context, row))
      ),
    };
  }

  async listCases(
    context: CurrentBusinessContext,
    filters: CrmCaseListFilters = {}
  ): Promise<CrmCaseSummaryView[]> {
    const parsed = crmCaseListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new CrmCaseError("INVALID_INPUT", CRM_CASE_USER_MESSAGES.INVALID_INPUT);
    }
    const rows = await this.caseRepository.listByFilters(context.businessId, {
      ...parsed.data,
      currentUserId: context.platformUserId,
    });
    return Promise.all(rows.map((row) => this.toSummaryView(context, row)));
  }

  async getCase(
    context: CurrentBusinessContext,
    caseId: string
  ): Promise<CrmCaseDetailView> {
    const row = await this.caseRepository.findById(context.businessId, caseId);
    if (!row) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, row);
  }

  async createCase(
    context: CurrentBusinessContext,
    payload: CreateCrmCasePayload
  ): Promise<CrmCaseDetailView> {
    const parsed = createCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmCaseError(
        "INVALID_INPUT",
        first?.message ?? CRM_CASE_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.catalogueRepository.ensureDefaults();
    const priorityCode =
      parsed.data.priorityCode ?? CRM_CASE_PRIORITY_CODES.NORMAL;
    const severityCode =
      parsed.data.severityCode ?? CRM_CASE_SEVERITY_CODES.MEDIUM;

    const [caseType, priority, severity] = await Promise.all([
      this.catalogueRepository.findTypeByCode(parsed.data.caseTypeCode),
      this.catalogueRepository.findPriorityByCode(priorityCode),
      this.catalogueRepository.findSeverityByCode(severityCode),
    ]);
    if (!caseType || !priority || !severity) {
      throw new CrmCaseError(
        "INVALID_CATALOGUE_CODE",
        CRM_CASE_USER_MESSAGES.INVALID_CATALOGUE_CODE,
        400
      );
    }

    if (severity.requiresImmediateOwner && !parsed.data.ownerUserId) {
      throw new CrmCaseError(
        "OWNER_REQUIRED",
        CRM_CASE_USER_MESSAGES.OWNER_REQUIRED,
        400,
        "ownerUserId"
      );
    }

    if (parsed.data.ownerUserId) {
      const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
        context.businessId,
        parsed.data.ownerUserId
      );
      if (!ownerAssignable) {
        throw new CrmCaseError(
          "INACTIVE_OWNER",
          CRM_CASE_USER_MESSAGES.INACTIVE_OWNER,
          400,
          "ownerUserId"
        );
      }
    }

    const party = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      parsed.data.primaryPartyId
    );
    if (!party) {
      throw new CrmCaseError(
        "PARTY_REQUIRED",
        CRM_CASE_USER_MESSAGES.PARTY_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    const openedAt = new Date();
    const slaPolicy = await this.slaPolicyRepository.findActiveForEntity(
      context.businessId,
      "CASE",
      priorityCode
    );
    const firstResponseHours =
      slaPolicy?.firstResponseTargetHours ?? priority.firstResponseTargetHours;
    const resolutionHours =
      slaPolicy?.resolutionTargetHours ?? priority.resolutionTargetHours;
    const dueDates = computeSlaDueDates(
      openedAt,
      firstResponseHours,
      resolutionHours
    );
    const statusCode = parsed.data.ownerUserId
      ? CRM_CASE_STATUS_CODES.OPEN
      : CRM_CASE_STATUS_CODES.NEW;

    const db = getDb();
    const sequence = await this.caseRepository.getNextSequenceNumber(
      context.businessId,
      db
    );

    const created = await db.transaction(async (tx) => {
      const row = await this.caseRepository.insert(
        {
          businessId: context.businessId,
          caseNumber: buildCaseNumber(sequence),
          caseTypeCode: parsed.data.caseTypeCode,
          categoryCode: parsed.data.categoryCode,
          subcategoryCode: parsed.data.subcategoryCode,
          subject: parsed.data.subject,
          description: parsed.data.description,
          statusCode,
          priorityCode,
          severityCode,
          channelCode: parsed.data.channelCode,
          ownerUserId: parsed.data.ownerUserId ?? null,
          queueCode: parsed.data.queueCode,
          primaryPartyId: parsed.data.primaryPartyId,
          primaryContactPartyId: parsed.data.primaryContactPartyId,
          linkedCommunicationId: parsed.data.linkedCommunicationId,
          slaPolicyId: slaPolicy?.id ?? null,
          escalationLevel: 0,
          openedAt,
          slaFirstResponseDueAt: dueDates.slaFirstResponseDueAt,
          slaResolutionDueAt: dueDates.slaResolutionDueAt,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      await this.entityLinkRepository.insertMany(
        [
          {
            businessId: context.businessId,
            caseId: row.id,
            entityTypeCode: CRM_CASE_ENTITY_TYPE_CODES.PARTY,
            entityId: parsed.data.primaryPartyId,
            isPrimary: true,
            createdBy: context.platformUserId,
          },
        ],
        tx
      );

      return row;
    });

    await recordCrmCaseAudit(this.auditService, context, {
      caseId: created.id,
      operation: AUDIT_OPERATIONS.CREATE,
      createValues: {
        caseNumber: created.caseNumber,
        caseTypeCode: created.caseTypeCode,
        statusCode: created.statusCode,
        priorityCode: created.priorityCode,
      },
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: parsed.data.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CASE_OPENED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_CASE,
        summary: `Case opened: ${parsed.data.subject}`,
        referenceEntity: "crm_case",
        referenceId: created.id,
      })
    );

    if (parsed.data.createFollowUpTask && parsed.data.ownerUserId) {
      await this.activityService.createActivity(context, {
        activityTypeCode: CRM_ACTIVITY_TYPE_CODES.TASK,
        subject: `Case action: ${parsed.data.subject}`,
        description: parsed.data.description,
        ownerUserId: parsed.data.ownerUserId,
        primaryPartyId: parsed.data.primaryPartyId,
        recordSourceCode: CRM_ACTIVITY_RECORD_SOURCE_CODES.CASE_ACTION,
        sourceReferenceType: "CASE",
        sourceReferenceId: created.id,
        entityLinks: [
          {
            entityTypeCode: CRM_ACTIVITY_ENTITY_TYPE_CODES.CASE,
            entityId: created.id,
            isPrimary: true,
          },
        ],
      });
    }

    return this.getCase(context, created.id);
  }

  async assignCase(
    context: CurrentBusinessContext,
    caseId: string,
    payload: AssignCrmCasePayload
  ): Promise<CrmCaseDetailView> {
    const parsed = assignCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError("INVALID_INPUT", CRM_CASE_USER_MESSAGES.INVALID_INPUT);
    }

    const existing = await this.requireEditableCase(context, caseId);
    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmCaseError(
        "INACTIVE_OWNER",
        CRM_CASE_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }

    // ENG-003n: reassignment would stop current SLA segment and start a new one.
    const nextStatus =
      existing.statusCode === CRM_CASE_STATUS_CODES.NEW
        ? CRM_CASE_STATUS_CODES.OPEN
        : existing.statusCode;

    if (
      nextStatus !== existing.statusCode &&
      !assertTransition(existing.statusCode, nextStatus)
    ) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      ownerUserId: parsed.data.ownerUserId,
      queueCode: parsed.data.queueCode ?? existing.queueCode,
      statusCode: nextStatus,
      firstRespondedAt: existing.firstRespondedAt ?? new Date(),
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }

    await recordCrmCaseAudit(this.auditService, context, {
      caseId,
      operation: AUDIT_OPERATIONS.UPDATE,
      metadata: {
        action: "assign",
        fromOwnerUserId: existing.ownerUserId,
        toOwnerUserId: parsed.data.ownerUserId,
        eng003nNote: "Would close prior assignee SLA segment and open new segment",
      },
    });

    return this.toDetailView(context, updated);
  }

  async updateCase(
    context: CurrentBusinessContext,
    caseId: string,
    payload: UpdateCrmCasePayload
  ): Promise<CrmCaseDetailView> {
    const parsed = updateCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError("INVALID_INPUT", CRM_CASE_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.requireEditableCase(context, caseId);

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      ...parsed.data,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, updated);
  }

  async setPendingCustomer(
    context: CurrentBusinessContext,
    caseId: string,
    payload: SetPendingCustomerPayload = {}
  ): Promise<CrmCaseDetailView> {
    const parsed = setPendingCustomerSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError("INVALID_INPUT", CRM_CASE_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.requireEditableCase(context, caseId);
    if (
      !assertTransition(existing.statusCode, CRM_CASE_STATUS_CODES.PENDING_CUSTOMER)
    ) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      statusCode: CRM_CASE_STATUS_CODES.PENDING_CUSTOMER,
      slaPausedAt: new Date(),
      slaPauseReasonCode:
        parsed.data.pauseReasonCode ??
        CRM_CASE_SLA_PAUSE_REASON_CODES.PENDING_CUSTOMER,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, updated);
  }

  async resumeCase(
    context: CurrentBusinessContext,
    caseId: string
  ): Promise<CrmCaseDetailView> {
    const existing = await this.requireEditableCase(context, caseId);
    if (existing.statusCode !== CRM_CASE_STATUS_CODES.PENDING_CUSTOMER) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }
    if (!assertTransition(existing.statusCode, CRM_CASE_STATUS_CODES.OPEN)) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      statusCode: CRM_CASE_STATUS_CODES.OPEN,
      slaPausedAt: null,
      slaPauseReasonCode: null,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, updated);
  }

  async escalateCase(
    context: CurrentBusinessContext,
    caseId: string,
    payload: EscalateCrmCasePayload,
    triggeredBy: string = CRM_CASE_ESCALATION_TRIGGERED_BY.MANUAL
  ): Promise<CrmCaseDetailView> {
    const parsed = escalateCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError("INVALID_INPUT", CRM_CASE_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.requireEditableCase(context, caseId);

    if (
      existing.statusCode !== CRM_CASE_STATUS_CODES.ESCALATED &&
      !assertTransition(existing.statusCode, CRM_CASE_STATUS_CODES.ESCALATED)
    ) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    if (parsed.data.toOwnerUserId) {
      const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
        context.businessId,
        parsed.data.toOwnerUserId
      );
      if (!ownerAssignable) {
        throw new CrmCaseError(
          "INACTIVE_OWNER",
          CRM_CASE_USER_MESSAGES.INACTIVE_OWNER,
          400,
          "toOwnerUserId"
        );
      }
    }

    const now = new Date();
    const db = getDb();
    const updated = await db.transaction(async (tx) => {
      await this.escalationRepository.insert(
        {
          businessId: context.businessId,
          caseId,
          fromOwnerUserId: existing.ownerUserId,
          toOwnerUserId: parsed.data.toOwnerUserId ?? existing.ownerUserId,
          reason: parsed.data.reason,
          triggeredBy,
          createdBy: context.platformUserId,
        },
        tx
      );

      const row = await this.caseRepository.updateById(
        context.businessId,
        caseId,
        {
          statusCode: CRM_CASE_STATUS_CODES.ESCALATED,
          escalatedAt: existing.escalatedAt ?? now,
          escalationLevel: (existing.escalationLevel ?? 0) + 1,
          ownerUserId: parsed.data.toOwnerUserId ?? existing.ownerUserId,
          slaPausedAt: null,
          slaPauseReasonCode: null,
          updatedBy: context.platformUserId,
          version: existing.version + 1,
        },
        tx
      );
      return row;
    });

    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CASE_ESCALATED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_CASE,
        summary: `Case escalated: ${existing.subject}`,
        referenceEntity: "crm_case",
        referenceId: caseId,
      })
    );

    return this.toDetailView(context, updated);
  }

  async resolveCase(
    context: CurrentBusinessContext,
    caseId: string,
    payload: ResolveCrmCasePayload
  ): Promise<CrmCaseDetailView> {
    const parsed = resolveCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError(
        "RESOLUTION_REQUIRED",
        CRM_CASE_USER_MESSAGES.RESOLUTION_REQUIRED
      );
    }
    const existing = await this.requireEditableCase(context, caseId);
    if (!assertTransition(existing.statusCode, CRM_CASE_STATUS_CODES.RESOLVED)) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    const resolution = await this.catalogueRepository.findResolutionByCode(
      parsed.data.resolutionCode
    );
    if (!resolution) {
      throw new CrmCaseError(
        "INVALID_CATALOGUE_CODE",
        CRM_CASE_USER_MESSAGES.INVALID_CATALOGUE_CODE,
        400,
        "resolutionCode"
      );
    }

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      statusCode: CRM_CASE_STATUS_CODES.RESOLVED,
      resolutionSummary: parsed.data.resolutionSummary,
      resolutionCode: parsed.data.resolutionCode,
      rootCauseCode: parsed.data.rootCauseCode ?? null,
      resolvedAt: new Date(),
      slaPausedAt: null,
      slaPauseReasonCode: null,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CASE_RESOLVED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_CASE,
        summary: `Case resolved: ${existing.subject}`,
        referenceEntity: "crm_case",
        referenceId: caseId,
      })
    );

    return this.toDetailView(context, updated);
  }

  async closeCase(
    context: CurrentBusinessContext,
    caseId: string,
    payload: CloseCrmCasePayload = {}
  ): Promise<CrmCaseDetailView> {
    const parsed = closeCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError("INVALID_INPUT", CRM_CASE_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.caseRepository.findById(context.businessId, caseId);
    if (!existing) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    if (existing.statusCode !== CRM_CASE_STATUS_CODES.RESOLVED) {
      throw new CrmCaseError(
        "CLOSE_FROM_RESOLVED",
        CRM_CASE_USER_MESSAGES.CLOSE_FROM_RESOLVED
      );
    }
    if (!assertTransition(existing.statusCode, CRM_CASE_STATUS_CODES.CLOSED)) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      statusCode: CRM_CASE_STATUS_CODES.CLOSED,
      closedAt: new Date(),
      satisfactionRating: parsed.data.satisfactionRating ?? null,
      satisfactionComment: parsed.data.satisfactionComment ?? null,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CASE_CLOSED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_CASE,
        summary: `Case closed: ${existing.subject}`,
        referenceEntity: "crm_case",
        referenceId: caseId,
      })
    );

    return this.toDetailView(context, updated);
  }

  async reopenCase(
    context: CurrentBusinessContext,
    caseId: string,
    payload: ReopenCrmCasePayload
  ): Promise<CrmCaseDetailView> {
    const parsed = reopenCrmCaseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmCaseError(
        "REOPEN_REASON_REQUIRED",
        CRM_CASE_USER_MESSAGES.REOPEN_REASON_REQUIRED
      );
    }
    const existing = await this.caseRepository.findById(context.businessId, caseId);
    if (!existing) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    if (existing.statusCode !== CRM_CASE_STATUS_CODES.CLOSED) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }
    // Local ENG-005 reopen stub — governed approval deferred to platform workflow.
    if (!assertTransition(existing.statusCode, CRM_CASE_STATUS_CODES.OPEN)) {
      throw new CrmCaseError(
        "INVALID_TRANSITION",
        CRM_CASE_USER_MESSAGES.INVALID_TRANSITION
      );
    }

    const updated = await this.caseRepository.updateById(context.businessId, caseId, {
      statusCode: CRM_CASE_STATUS_CODES.OPEN,
      closedAt: null,
      reopenReason: parsed.data.reopenReason,
      reopenedAt: new Date(),
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }

    await recordCrmCaseAudit(this.auditService, context, {
      caseId,
      operation: AUDIT_OPERATIONS.UPDATE,
      metadata: {
        action: "reopen",
        eng005Stub: true,
        reopenReason: parsed.data.reopenReason,
      },
    });

    return this.toDetailView(context, updated);
  }

  async checkAndMarkSlaBreaches(
    context: CurrentBusinessContext
  ): Promise<{ breached: number; escalated: number }> {
    const pastDue = await this.caseRepository.listOpenPastDue(context.businessId);
    let breached = 0;
    let escalated = 0;

    for (const row of pastDue) {
      if (!row.slaBreachedAt) {
        await this.caseRepository.updateById(context.businessId, row.id, {
          slaBreachedAt: new Date(),
          updatedBy: context.platformUserId,
          version: row.version + 1,
        });
        breached += 1;
      }

      if (row.statusCode !== CRM_CASE_STATUS_CODES.ESCALATED) {
        await this.escalateCase(
          context,
          row.id,
          { reason: "Automatic escalation on SLA breach" },
          CRM_CASE_ESCALATION_TRIGGERED_BY.SYSTEM
        );
        escalated += 1;
      }
    }

    return { breached, escalated };
  }

  async getCustomer360Contribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmCaseCustomer360Contribution> {
    const now = new Date();
    const [openRows, complaintRows, recentRows] = await Promise.all([
      this.caseRepository.listOpenForParty(context.businessId, partyId),
      this.caseRepository.listByTypeForParty(
        context.businessId,
        partyId,
        CRM_CASE_TYPE_CODES.COMPLAINT,
        1
      ),
      this.caseRepository.listRecentForParty(context.businessId, partyId, 5),
    ]);
    const escalatedRows = openRows.filter(
      (row) => row.statusCode === CRM_CASE_STATUS_CODES.ESCALATED
    );
    const slaAtRiskRows = openRows.filter((row) =>
      isSlaAtRisk(row.slaResolutionDueAt, row.slaPausedAt, now)
    );
    const breachedRows = openRows.filter((row) =>
      isSlaBreached(row.slaResolutionDueAt, row.slaBreachedAt, now)
    );
    const openCases = await Promise.all(
      openRows.slice(0, 5).map((row) => this.toSummaryView(context, row))
    );
    const escalatedCases = await Promise.all(
      escalatedRows.slice(0, 5).map((row) => this.toSummaryView(context, row))
    );
    const slaAtRiskCases = await Promise.all(
      slaAtRiskRows.slice(0, 5).map((row) => this.toSummaryView(context, row))
    );
    const breachedCases = await Promise.all(
      breachedRows.slice(0, 5).map((row) => this.toSummaryView(context, row))
    );
    const recentCases = await Promise.all(
      recentRows.map((row) => this.toSummaryView(context, row))
    );
    const lastComplaint = complaintRows[0]
      ? await this.toSummaryView(context, complaintRows[0])
      : null;

    return {
      openCaseCount: openRows.length,
      escalatedCaseCount: escalatedRows.length,
      slaAtRiskCount: slaAtRiskRows.length,
      breachedCaseCount: breachedRows.length,
      lastComplaint,
      openCases,
      escalatedCases,
      slaAtRiskCases,
      breachedCases,
      recentCases,
    };
  }

  private async requireEditableCase(
    context: CurrentBusinessContext,
    caseId: string
  ): Promise<CaseRow> {
    const existing = await this.caseRepository.findById(context.businessId, caseId);
    if (!existing) {
      throw new CrmCaseError("NOT_FOUND", CRM_CASE_USER_MESSAGES.NOT_FOUND, 404);
    }
    if (!isCaseEditable(existing.statusCode)) {
      throw new CrmCaseError("NOT_EDITABLE", CRM_CASE_USER_MESSAGES.NOT_EDITABLE);
    }
    return existing;
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: CaseRow
  ): Promise<CrmCaseSummaryView> {
    const [ownerDisplayName, party] = await Promise.all([
      row.ownerUserId
        ? this.referenceRepository.getOwnerDisplayName(row.ownerUserId)
        : Promise.resolve(null),
      this.partyRepository.findByIdIncludingArchived(
        context.businessId,
        row.primaryPartyId
      ),
    ]);
    const now = new Date();
    const typeCode = row.caseTypeCode as CrmCaseTypeCode;
    const statusCode = row.statusCode as CrmCaseStatusCode;
    const priorityCode = row.priorityCode as CrmCasePriorityCode;
    const severityCode = row.severityCode as CrmCaseSeverityCode;

    return {
      id: row.id,
      caseNumber: row.caseNumber,
      caseTypeCode: row.caseTypeCode,
      caseTypeLabel: CRM_CASE_TYPE_LABELS[typeCode] ?? row.caseTypeCode,
      subject: row.subject,
      statusCode: row.statusCode,
      statusLabel: CRM_CASE_STATUS_LABELS[statusCode] ?? row.statusCode,
      priorityCode: row.priorityCode,
      priorityLabel: CRM_CASE_PRIORITY_LABELS[priorityCode] ?? row.priorityCode,
      severityCode: row.severityCode,
      severityLabel: CRM_CASE_SEVERITY_LABELS[severityCode] ?? row.severityCode,
      primaryPartyId: row.primaryPartyId,
      primaryPartyDisplayName: party?.displayName ?? "Unknown Party",
      ownerUserId: row.ownerUserId,
      ownerDisplayName: ownerDisplayName,
      queueCode: row.queueCode,
      openedAt: row.openedAt.toISOString(),
      slaResolutionDueAt: row.slaResolutionDueAt?.toISOString() ?? null,
      slaBreachedAt: row.slaBreachedAt?.toISOString() ?? null,
      slaPolicyId: row.slaPolicyId ?? null,
      subcategoryCode: row.subcategoryCode ?? null,
      escalationLevel: row.escalationLevel ?? 0,
      slaRemainingMs: computeSlaRemainingMs(
        row.slaResolutionDueAt,
        row.slaPausedAt,
        now
      ),
      isSlaAtRisk: isSlaAtRisk(row.slaResolutionDueAt, row.slaPausedAt, now),
      isSlaBreached: isSlaBreached(
        row.slaResolutionDueAt,
        row.slaBreachedAt,
        now
      ),
      isOverdue: isOverdue({
        statusCode: row.statusCode,
        slaResolutionDueAt: row.slaResolutionDueAt,
        slaPausedAt: row.slaPausedAt,
        now,
      }),
      isEscalated: row.statusCode === CRM_CASE_STATUS_CODES.ESCALATED,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: CaseRow
  ): Promise<CrmCaseDetailView> {
    const summary = await this.toSummaryView(context, row);
    const escalations = await this.escalationRepository.listByCaseId(row.id);

    return {
      ...summary,
      categoryCode: row.categoryCode,
      description: row.description,
      channelCode: row.channelCode,
      primaryContactPartyId: row.primaryContactPartyId,
      linkedCommunicationId: row.linkedCommunicationId,
      resolutionSummary: row.resolutionSummary,
      resolutionCode: row.resolutionCode,
      rootCauseCode: row.rootCauseCode,
      satisfactionRating: row.satisfactionRating,
      satisfactionComment: row.satisfactionComment,
      firstRespondedAt: row.firstRespondedAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      escalatedAt: row.escalatedAt?.toISOString() ?? null,
      slaFirstResponseDueAt: row.slaFirstResponseDueAt?.toISOString() ?? null,
      slaAtRiskAt: row.slaAtRiskAt?.toISOString() ?? null,
      slaPausedAt: row.slaPausedAt?.toISOString() ?? null,
      slaPauseReasonCode: row.slaPauseReasonCode,
      reopenReason: row.reopenReason,
      reopenedAt: row.reopenedAt?.toISOString() ?? null,
      isEditable: isCaseEditable(row.statusCode),
      version: row.version,
      escalations: escalations.map((item) => ({
        id: item.id,
        fromOwnerUserId: item.fromOwnerUserId,
        toOwnerUserId: item.toOwnerUserId,
        reason: item.reason,
        triggeredBy: item.triggeredBy,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }
}

export function createCrmCaseService() {
  return new CrmCaseService();
}
