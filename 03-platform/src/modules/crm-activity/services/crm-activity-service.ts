/**
 * Purpose:
 * CRM Activity & Task orchestration.
 *
 * Architecture:
 * Server Actions → CrmActivityService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-004 / IP-05 – Activity & Task Management
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
  CRM_ACTIVITY_ENTITY_TYPE_LABELS,
  CRM_ACTIVITY_LIST_VIEWS,
  CRM_ACTIVITY_OUTCOME_LABELS,
  CRM_ACTIVITY_PRIORITY_CODES,
  CRM_ACTIVITY_PRIORITY_LABELS,
  CRM_ACTIVITY_RECORD_SOURCE_CODES,
  CRM_ACTIVITY_STATUS_CODES,
  CRM_ACTIVITY_TYPE_LABELS,
  CRM_ACTIVITY_STATUS_LABELS,
  type CrmActivityOutcomeCode,
  type CrmActivityPriorityCode,
  type CrmActivityStatusCode,
  type CrmActivityTypeCode,
} from "@/modules/crm-activity/constants";
import {
  CRM_ACTIVITY_USER_MESSAGES,
  CrmActivityError,
} from "@/modules/crm-activity/errors";
import { createCrmActivityCatalogueRepository } from "@/modules/crm-activity/repositories/crm-activity-catalogue-repository";
import { createCrmActivityEntityLinkRepository } from "@/modules/crm-activity/repositories/crm-activity-entity-link-repository";
import { createCrmActivityReferenceRepository } from "@/modules/crm-activity/repositories/crm-activity-reference-repository";
import { createCrmActivityRepository } from "@/modules/crm-activity/repositories/crm-activity-repository";
import {
  AUDIT_OPERATIONS,
  recordCrmActivityAudit,
} from "@/modules/crm-activity/services/crm-activity-audit-helper";
import {
  buildActivityNumber,
  canCancelActivity,
  canCompleteActivity,
  canDeferActivity,
  hasEntityLinkRequirement,
  isActivityEditable,
  isActivityOverdue,
  isOpenActivityStatus,
  normalizeLegacyStatusCode,
  recordSourceLabel,
  resolveActivityDate,
  resolveDefaultPriority,
  resolveInitialStatus,
  validateCompletionNotes,
  validateDueDateAfterActivityDate,
  validateScheduledWindow,
} from "@/modules/crm-activity/services/crm-activity-rules";
import type {
  CancelCrmActivityPayload,
  CompleteCrmActivityPayload,
  CreateCrmActivityPayload,
  CrmActivityCustomer360Contribution,
  CrmActivityDashboardView,
  CrmActivityDetailView,
  CrmActivityListFilters,
  CrmActivityRegistrationCatalogues,
  CrmActivitySummaryView,
  DeferCrmActivityPayload,
  ReassignCrmActivityPayload,
  UpdateCrmActivityPayload,
} from "@/modules/crm-activity/types";
import {
  cancelCrmActivitySchema,
  completeCrmActivitySchema,
  createCrmActivitySchema,
  crmActivityListFiltersSchema,
  deferCrmActivitySchema,
  reassignCrmActivitySchema,
  updateCrmActivitySchema,
} from "@/modules/crm-activity/validators/crm-activity-validators";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";

type ActivityRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createCrmActivityRepository>["findById"]>>
>;

export class CrmActivityService {
  constructor(
    private readonly activityRepository = createCrmActivityRepository(),
    private readonly entityLinkRepository = createCrmActivityEntityLinkRepository(),
    private readonly referenceRepository = createCrmActivityReferenceRepository(),
    private readonly catalogueRepository = createCrmActivityCatalogueRepository(),
    private readonly partyRepository = createPartyRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<CrmActivityRegistrationCatalogues> {
    await this.catalogueRepository.ensureDefaults();

    const [owners, activityTypes, priorities] = await Promise.all([
      this.referenceRepository.listActiveOwners(context.businessId),
      this.catalogueRepository.listActiveTypes(),
      this.catalogueRepository.listActivePriorities(),
    ]);

    return {
      activityTypes: activityTypes.map((row) => ({
        code: row.code,
        label: row.name,
      })),
      priorities: priorities.map((row) => ({
        code: row.code,
        label: row.name,
      })),
      outcomes: Object.entries(CRM_ACTIVITY_OUTCOME_LABELS).map(
        ([code, label]) => ({ code, label })
      ),
      entityTypes: Object.entries(CRM_ACTIVITY_ENTITY_TYPE_LABELS).map(
        ([code, label]) => ({ code, label })
      ),
      owners: owners.map((owner) => ({
        id: owner.id,
        displayName:
          owner.displayName?.trim() ||
          `${owner.firstName} ${owner.lastName}`.trim(),
      })),
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<CrmActivityDashboardView> {
    const [allOpenRows, myOpen, overdue, recentRows] = await Promise.all([
      this.activityRepository.listByFilters(context.businessId, {}),
      this.activityRepository.countOpenByOwner(
        context.businessId,
        context.platformUserId
      ),
      this.activityRepository.countOverdue(context.businessId),
      this.activityRepository.listByFilters(context.businessId, {
        view: CRM_ACTIVITY_LIST_VIEWS.ALL,
      }),
    ]);

    const allOpen = allOpenRows.filter((row) =>
      isOpenActivityStatus(normalizeLegacyStatusCode(row.statusCode))
    );

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const dueThisWeek = allOpen.filter(
      (row) =>
        row.dueDate &&
        row.dueDate >= now &&
        row.dueDate <= weekEnd
    ).length;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = recentRows.filter(
      (row) =>
        row.statusCode === CRM_ACTIVITY_STATUS_CODES.COMPLETED &&
        row.completedAt &&
        row.completedAt >= monthStart
    ).length;

    const recentActivities = await Promise.all(
      recentRows.slice(0, 8).map((row) => this.toSummaryView(context, row))
    );

    return {
      totalOpen: allOpen.length,
      myOpen,
      overdue,
      dueThisWeek,
      completedThisMonth,
      recentActivities,
    };
  }

  async listActivities(
    context: CurrentBusinessContext,
    filters: CrmActivityListFilters = {}
  ): Promise<CrmActivitySummaryView[]> {
    const parsed = crmActivityListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const rows = await this.activityRepository.listByFilters(
      context.businessId,
      {
        view: parsed.data.view,
        currentUserId: context.platformUserId,
        activityTypeCode: parsed.data.activityTypeCode,
        statusCode: parsed.data.statusCode,
        ownerUserId: parsed.data.ownerUserId,
        primaryPartyId: parsed.data.primaryPartyId,
        entityTypeCode: parsed.data.entityTypeCode,
        entityId: parsed.data.entityId,
        dueFrom: parsed.data.dueFrom ? new Date(parsed.data.dueFrom) : undefined,
        dueTo: parsed.data.dueTo ? new Date(parsed.data.dueTo) : undefined,
        search: parsed.data.search,
        overdueOnly: parsed.data.view === CRM_ACTIVITY_LIST_VIEWS.OVERDUE,
      }
    );

    const filtered =
      parsed.data.view === CRM_ACTIVITY_LIST_VIEWS.OVERDUE
        ? rows.filter((row) =>
            isActivityOverdue(row.statusCode, row.dueDate ?? null)
          )
        : rows;

    return Promise.all(
      filtered.map((row) => this.toSummaryView(context, row))
    );
  }

  async getActivity(
    context: CurrentBusinessContext,
    activityId: string
  ): Promise<CrmActivityDetailView> {
    const row = await this.activityRepository.findById(
      context.businessId,
      activityId
    );

    if (!row) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    return this.toDetailView(context, row);
  }

  async createActivity(
    context: CurrentBusinessContext,
    payload: CreateCrmActivityPayload
  ): Promise<CrmActivityDetailView> {
    const parsed = createCrmActivitySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    if (
      !hasEntityLinkRequirement(
        parsed.data.primaryPartyId,
        parsed.data.entityLinks
      )
    ) {
      throw new CrmActivityError(
        "ENTITY_LINK_REQUIRED",
        CRM_ACTIVITY_USER_MESSAGES.ENTITY_LINK_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    await this.catalogueRepository.ensureDefaults();

    const activityType = await this.catalogueRepository.findTypeByCode(
      parsed.data.activityTypeCode
    );
    if (!activityType) {
      throw new CrmActivityError(
        "INVALID_CATALOGUE_CODE",
        CRM_ACTIVITY_USER_MESSAGES.INVALID_CATALOGUE_CODE,
        400,
        "activityTypeCode"
      );
    }

    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmActivityError(
        "INACTIVE_OWNER",
        CRM_ACTIVITY_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }

    const scheduledStart = parsed.data.scheduledStart
      ? new Date(parsed.data.scheduledStart)
      : null;
    const scheduledEnd = parsed.data.scheduledEnd
      ? new Date(parsed.data.scheduledEnd)
      : null;
    const scheduleError = validateScheduledWindow(scheduledStart, scheduledEnd);
    if (scheduleError) {
      throw new CrmActivityError(
        "INVALID_INPUT",
        scheduleError,
        400,
        "scheduledEnd"
      );
    }

    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    const activityDate = resolveActivityDate(scheduledStart, new Date());
    const dueDateError = validateDueDateAfterActivityDate(dueDate, activityDate);
    if (dueDateError) {
      throw new CrmActivityError(
        "DUE_BEFORE_ACTIVITY",
        CRM_ACTIVITY_USER_MESSAGES.DUE_BEFORE_ACTIVITY,
        400,
        "dueDate"
      );
    }

    const party = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      parsed.data.primaryPartyId
    );
    if (!party) {
      throw new CrmActivityError(
        "PARTY_REQUIRED",
        CRM_ACTIVITY_USER_MESSAGES.PARTY_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    const db = getDb();
    const sequence = await this.activityRepository.getNextSequenceNumber(
      context.businessId,
      db
    );
    const activityNumber = buildActivityNumber(sequence);

    const row = await db.transaction(async (tx) => {
      const created = await this.activityRepository.insert(
        {
          businessId: context.businessId,
          activityNumber,
          activityTypeCode: parsed.data.activityTypeCode,
          subject: parsed.data.subject,
          description: parsed.data.description ?? null,
          statusCode: resolveInitialStatus(Boolean(parsed.data.ownerUserId)),
          priorityCode:
            parsed.data.priorityCode ?? resolveDefaultPriority(),
          dueDate,
          scheduledStart,
          scheduledEnd,
          ownerUserId: parsed.data.ownerUserId,
          primaryPartyId: parsed.data.primaryPartyId,
          recordSourceCode:
            parsed.data.recordSourceCode ??
            CRM_ACTIVITY_RECORD_SOURCE_CODES.MANUAL,
          sourceReferenceType: parsed.data.sourceReferenceType ?? null,
          sourceReferenceId: parsed.data.sourceReferenceId ?? null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      const links = [
        {
          businessId: context.businessId,
          activityId: created.id,
          entityTypeCode: CRM_ACTIVITY_ENTITY_TYPE_CODES.PARTY,
          entityId: parsed.data.primaryPartyId,
          isPrimary: true,
          createdBy: context.platformUserId,
        },
        ...(parsed.data.entityLinks ?? []).map((link) => ({
          businessId: context.businessId,
          activityId: created.id,
          entityTypeCode: link.entityTypeCode,
          entityId: link.entityId,
          isPrimary: link.isPrimary ?? false,
          createdBy: context.platformUserId,
        })),
      ];

      await this.entityLinkRepository.insertMany(links, tx);

      return created;
    });

    await recordCrmActivityAudit(this.auditService, context, {
      activityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      createValues: {
        activityNumber: row.activityNumber,
        subject: row.subject,
        activityTypeCode: row.activityTypeCode,
        ownerUserId: row.ownerUserId,
      },
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: parsed.data.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_CREATED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_ACTIVITY,
        summary: `Activity created: ${row.subject}`,
        referenceEntity: "crm_activity",
        referenceId: row.id,
        metadata: {
          activityNumber: row.activityNumber,
          activityTypeCode: row.activityTypeCode,
        },
      })
    );

    return this.toDetailView(context, row);
  }

  async updateActivity(
    context: CurrentBusinessContext,
    activityId: string,
    payload: UpdateCrmActivityPayload
  ): Promise<CrmActivityDetailView> {
    const parsed = updateCrmActivitySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const existing = await this.activityRepository.findById(
      context.businessId,
      activityId
    );
    if (!existing) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!isActivityEditable(existing.statusCode)) {
      if (!parsed.data.addendumNotes) {
        throw new CrmActivityError(
          "COMPLETED_READ_ONLY",
          CRM_ACTIVITY_USER_MESSAGES.COMPLETED_READ_ONLY,
          409
        );
      }

      const mergedNotes = [existing.outcomeNotes, parsed.data.addendumNotes]
        .filter(Boolean)
        .join("\n\n");

      const row = await this.activityRepository.updateById(
        context.businessId,
        activityId,
        {
          outcomeNotes: mergedNotes,
          updatedBy: context.platformUserId,
          version: existing.version + 1,
        }
      );

      if (!row) {
        throw new CrmActivityError(
          "NOT_FOUND",
          CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
          404
        );
      }

      return this.toDetailView(context, row);
    }

    const scheduledStart = parsed.data.scheduledStart
      ? new Date(parsed.data.scheduledStart)
      : existing.scheduledStart;
    const scheduledEnd = parsed.data.scheduledEnd
      ? new Date(parsed.data.scheduledEnd)
      : existing.scheduledEnd;
    const scheduleError = validateScheduledWindow(scheduledStart, scheduledEnd);
    if (scheduleError) {
      throw new CrmActivityError(
        "INVALID_INPUT",
        scheduleError,
        400,
        "scheduledEnd"
      );
    }

    const row = await this.activityRepository.updateById(
      context.businessId,
      activityId,
      {
        subject: parsed.data.subject,
        description: parsed.data.description,
        priorityCode: parsed.data.priorityCode,
        dueDate:
          parsed.data.dueDate === undefined
            ? undefined
            : parsed.data.dueDate
              ? new Date(parsed.data.dueDate)
              : null,
        scheduledStart:
          parsed.data.scheduledStart === undefined
            ? undefined
            : parsed.data.scheduledStart
              ? new Date(parsed.data.scheduledStart)
              : null,
        scheduledEnd:
          parsed.data.scheduledEnd === undefined
            ? undefined
            : parsed.data.scheduledEnd
              ? new Date(parsed.data.scheduledEnd)
              : null,
        ownerUserId: parsed.data.ownerUserId,
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!row) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await recordCrmActivityAudit(this.auditService, context, {
      activityId,
      operation: AUDIT_OPERATIONS.UPDATE,
      before: existing as unknown as Record<string, unknown>,
      after: row as unknown as Record<string, unknown>,
      trackFields: [
        "subject",
        "description",
        "priorityCode",
        "dueDate",
        "ownerUserId",
      ],
    });

    return this.toDetailView(context, row);
  }

  async completeActivity(
    context: CurrentBusinessContext,
    activityId: string,
    payload: CompleteCrmActivityPayload
  ): Promise<CrmActivityDetailView> {
    const parsed = completeCrmActivitySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const existing = await this.activityRepository.findById(
      context.businessId,
      activityId
    );
    if (!existing) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    const normalizedStatus = normalizeLegacyStatusCode(existing.statusCode);

    if (!canCompleteActivity(normalizedStatus)) {
      throw new CrmActivityError(
        "INVALID_INPUT",
        "This activity cannot be completed in its current status.",
        409
      );
    }

    const activityType = await this.catalogueRepository.findTypeByCode(
      existing.activityTypeCode
    );
    const notesError = validateCompletionNotes({
      outcomeNotes: parsed.data.outcomeNotes,
      requiresTypeNotes: activityType?.requiresCompletionNotes ?? false,
      isOverdue: isActivityOverdue(normalizedStatus, existing.dueDate ?? null),
      outcomeCode: parsed.data.outcomeCode,
    });
    if (notesError) {
      throw new CrmActivityError(
        "COMPLETION_NOTES_REQUIRED",
        notesError,
        400,
        "outcomeNotes"
      );
    }

    const row = await this.activityRepository.updateById(
      context.businessId,
      activityId,
      {
        statusCode: CRM_ACTIVITY_STATUS_CODES.COMPLETED,
        outcomeCode: parsed.data.outcomeCode,
        outcomeNotes: parsed.data.outcomeNotes ?? null,
        completedAt: new Date(),
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!row) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await recordCrmActivityAudit(this.auditService, context, {
      activityId,
      operation: AUDIT_OPERATIONS.UPDATE,
      metadata: { action: "COMPLETE", outcomeCode: parsed.data.outcomeCode },
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_COMPLETED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_ACTIVITY,
        summary: `Activity completed: ${existing.subject}`,
        referenceEntity: "crm_activity",
        referenceId: activityId,
        metadata: { outcomeCode: parsed.data.outcomeCode },
      })
    );

    return this.toDetailView(context, row);
  }

  async cancelActivity(
    context: CurrentBusinessContext,
    activityId: string,
    payload: CancelCrmActivityPayload
  ): Promise<CrmActivityDetailView> {
    const parsed = cancelCrmActivitySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const existing = await this.activityRepository.findById(
      context.businessId,
      activityId
    );
    if (!existing) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!canCancelActivity(existing.statusCode)) {
      throw new CrmActivityError(
        "INVALID_INPUT",
        "This activity cannot be cancelled in its current status.",
        409
      );
    }

    const row = await this.activityRepository.updateById(
      context.businessId,
      activityId,
      {
        statusCode: CRM_ACTIVITY_STATUS_CODES.CANCELLED,
        cancelReason: parsed.data.cancelReason,
        cancelledAt: new Date(),
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!row) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_CANCELLED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_ACTIVITY,
        summary: `Activity cancelled: ${existing.subject}`,
        referenceEntity: "crm_activity",
        referenceId: activityId,
      })
    );

    return this.toDetailView(context, row);
  }

  async deferActivity(
    context: CurrentBusinessContext,
    activityId: string,
    payload: DeferCrmActivityPayload
  ): Promise<CrmActivityDetailView> {
    const parsed = deferCrmActivitySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const existing = await this.activityRepository.findById(
      context.businessId,
      activityId
    );
    if (!existing) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!canDeferActivity(existing.statusCode)) {
      throw new CrmActivityError(
        "INVALID_INPUT",
        "This activity cannot be deferred in its current status.",
        409
      );
    }

    const deferredUntil = new Date(parsed.data.deferredUntil);
    const row = await this.activityRepository.updateById(
      context.businessId,
      activityId,
      {
        statusCode: CRM_ACTIVITY_STATUS_CODES.DEFERRED,
        deferReason: parsed.data.deferReason,
        deferredUntil,
        dueDate: deferredUntil,
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!row) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_DEFERRED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_ACTIVITY,
        summary: `Activity deferred: ${existing.subject}`,
        referenceEntity: "crm_activity",
        referenceId: activityId,
      })
    );

    return this.toDetailView(context, row);
  }

  async reassignActivity(
    context: CurrentBusinessContext,
    activityId: string,
    payload: ReassignCrmActivityPayload
  ): Promise<CrmActivityDetailView> {
    const parsed = reassignCrmActivitySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmActivityError(
        "INVALID_INPUT",
        first?.message ?? CRM_ACTIVITY_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const existing = await this.activityRepository.findById(
      context.businessId,
      activityId
    );
    if (!existing) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!isActivityEditable(normalizeLegacyStatusCode(existing.statusCode))) {
      throw new CrmActivityError(
        "COMPLETED_READ_ONLY",
        CRM_ACTIVITY_USER_MESSAGES.COMPLETED_READ_ONLY,
        409
      );
    }

    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmActivityError(
        "INACTIVE_OWNER",
        CRM_ACTIVITY_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }

    const row = await this.activityRepository.updateById(
      context.businessId,
      activityId,
      {
        ownerUserId: parsed.data.ownerUserId,
        statusCode: CRM_ACTIVITY_STATUS_CODES.ASSIGNED,
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!row) {
      throw new CrmActivityError(
        "NOT_FOUND",
        CRM_ACTIVITY_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await recordCrmActivityAudit(this.auditService, context, {
      activityId,
      operation: AUDIT_OPERATIONS.UPDATE,
      metadata: {
        action: "REASSIGN",
        previousOwnerUserId: existing.ownerUserId,
        newOwnerUserId: parsed.data.ownerUserId,
        reason: parsed.data.reason ?? null,
      },
    });

    return this.toDetailView(context, row);
  }

  async getCustomer360Contribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmActivityCustomer360Contribution> {
    const rows = await this.activityRepository.listByFilters(
      context.businessId,
      { primaryPartyId: partyId }
    );

    const now = new Date();
    const openRows = rows.filter((row) =>
      isOpenActivityStatus(normalizeLegacyStatusCode(row.statusCode))
    );

    const overdueRows = openRows.filter((row) =>
      isActivityOverdue(row.statusCode, row.dueDate ?? null, now)
    );

    await this.emitOverdueEvents(context, overdueRows);

    const upcomingRows = openRows.filter(
      (row) => row.dueDate && row.dueDate.getTime() >= now.getTime()
    );

    const [recentActivities, openTasks, overdueTasks, upcomingActivities] =
      await Promise.all([
        Promise.all(
          rows.slice(0, 5).map((row) => this.toSummaryView(context, row))
        ),
        Promise.all(
          openRows.slice(0, 5).map((row) => this.toSummaryView(context, row))
        ),
        Promise.all(
          overdueRows.slice(0, 5).map((row) => this.toSummaryView(context, row))
        ),
        Promise.all(
          upcomingRows
            .sort(
              (left, right) =>
                (left.dueDate?.getTime() ?? 0) - (right.dueDate?.getTime() ?? 0)
            )
            .slice(0, 5)
            .map((row) => this.toSummaryView(context, row))
        ),
      ]);

    const nextFollowUp = upcomingRows
      .sort(
        (left, right) =>
          (left.dueDate?.getTime() ?? 0) - (right.dueDate?.getTime() ?? 0)
      )[0]?.dueDate;

    return {
      recentActivities,
      openTasks,
      overdueTasks,
      upcomingActivities,
      openTasksCount: openRows.length,
      overdueTasksCount: overdueRows.length,
      upcomingActivitiesCount: upcomingRows.length,
      nextFollowUpDate: nextFollowUp?.toISOString() ?? null,
    };
  }

  /**
   * Emit ACTIVITY_OVERDUE once per activity (guarded by overdueEventEmittedAt).
   */
  private async emitOverdueEvents(
    context: CurrentBusinessContext,
    overdueRows: ActivityRow[]
  ): Promise<void> {
    const now = new Date();
    for (const row of overdueRows) {
      if (row.overdueEventEmittedAt) continue;

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: row.primaryPartyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.ACTIVITY_OVERDUE,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_ACTIVITY,
          summary: `Activity overdue: ${row.subject}`,
          referenceEntity: "crm_activity",
          referenceId: row.id,
        })
      );

      await this.activityRepository.updateById(context.businessId, row.id, {
        overdueEventEmittedAt: now,
        updatedBy: context.platformUserId,
        version: row.version + 1,
      });
    }
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: ActivityRow
  ): Promise<CrmActivitySummaryView> {
    const [ownerDisplayName, party] = await Promise.all([
      this.referenceRepository.getOwnerDisplayName(row.ownerUserId),
      this.partyRepository.findByIdIncludingArchived(
        context.businessId,
        row.primaryPartyId
      ),
    ]);

    const statusCode = normalizeLegacyStatusCode(
      row.statusCode
    ) as CrmActivityStatusCode;

    return {
      id: row.id,
      activityNumber: row.activityNumber,
      activityTypeCode: row.activityTypeCode as CrmActivityTypeCode,
      activityTypeLabel:
        CRM_ACTIVITY_TYPE_LABELS[row.activityTypeCode as CrmActivityTypeCode] ??
        row.activityTypeCode,
      subject: row.subject,
      statusCode,
      statusLabel:
        CRM_ACTIVITY_STATUS_LABELS[statusCode] ?? row.statusCode,
      priorityCode: row.priorityCode as CrmActivityPriorityCode,
      priorityLabel:
        CRM_ACTIVITY_PRIORITY_LABELS[row.priorityCode as CrmActivityPriorityCode] ??
        row.priorityCode,
      dueDate: row.dueDate?.toISOString() ?? null,
      ownerUserId: row.ownerUserId,
      ownerDisplayName: ownerDisplayName ?? "Unknown",
      primaryPartyId: row.primaryPartyId,
      primaryPartyDisplayName: party?.displayName ?? "Unknown",
      isOverdue: isActivityOverdue(statusCode, row.dueDate ?? null),
      completedAt: row.completedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: ActivityRow
  ): Promise<CrmActivityDetailView> {
    const summary = await this.toSummaryView(context, row);
    const entityLinks = await this.entityLinkRepository.listByActivityId(
      context.businessId,
      row.id
    );

    return {
      ...summary,
      description: row.description,
      scheduledStart: row.scheduledStart?.toISOString() ?? null,
      scheduledEnd: row.scheduledEnd?.toISOString() ?? null,
      outcomeCode: row.outcomeCode,
      outcomeLabel: row.outcomeCode
        ? CRM_ACTIVITY_OUTCOME_LABELS[row.outcomeCode as CrmActivityOutcomeCode] ??
          row.outcomeCode
        : null,
      outcomeNotes: row.outcomeNotes,
      cancelReason: row.cancelReason,
      deferReason: row.deferReason,
      deferredUntil: row.deferredUntil?.toISOString() ?? null,
      recordSourceCode: row.recordSourceCode,
      recordSourceLabel: recordSourceLabel(row.recordSourceCode),
      sourceReferenceType: row.sourceReferenceType,
      sourceReferenceId: row.sourceReferenceId,
      entityLinks: entityLinks.map((link) => ({
        id: link.id,
        entityTypeCode: link.entityTypeCode,
        entityTypeLabel:
          CRM_ACTIVITY_ENTITY_TYPE_LABELS[
            link.entityTypeCode as keyof typeof CRM_ACTIVITY_ENTITY_TYPE_LABELS
          ] ?? link.entityTypeCode,
        entityId: link.entityId,
        isPrimary: link.isPrimary,
      })),
      createdAt: row.createdAt.toISOString(),
      version: row.version,
      editable: isActivityEditable(normalizeLegacyStatusCode(row.statusCode)),
    };
  }
}

export function createCrmActivityService() {
  return new CrmActivityService();
}
