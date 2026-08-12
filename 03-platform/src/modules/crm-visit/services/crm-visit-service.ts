/**
 * CRM Visit orchestration — BP-004 / IP-07
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
  CRM_ACTIVITY_RECORD_SOURCE_CODES,
  CRM_ACTIVITY_TYPE_CODES,
} from "@/modules/crm-activity/constants";
import { createCrmActivityService } from "@/modules/crm-activity/services/crm-activity-service";
import { createCrmAppointmentRepository } from "@/modules/crm-appointment/repositories/crm-appointment-repository";
import {
  CRM_VISIT_ENTITY_TYPE_CODES,
  CRM_VISIT_SLA_ARCHITECTURE,
  CRM_VISIT_STATUS_CODES,
  CRM_VISIT_STATUS_LABELS,
  CRM_VISIT_TYPE_LABELS,
  type CrmVisitStatusCode,
  type CrmVisitTypeCode,
} from "@/modules/crm-visit/constants";
import { CRM_VISIT_USER_MESSAGES, CrmVisitError } from "@/modules/crm-visit/errors";
import { createCrmVisitActionItemRepository } from "@/modules/crm-visit/repositories/crm-visit-action-item-repository";
import { createCrmVisitAttendeeRepository } from "@/modules/crm-visit/repositories/crm-visit-attendee-repository";
import { createCrmVisitCatalogueRepository } from "@/modules/crm-visit/repositories/crm-visit-catalogue-repository";
import { createCrmVisitDocumentRepository } from "@/modules/crm-visit/repositories/crm-visit-document-repository";
import { createCrmVisitEntityLinkRepository } from "@/modules/crm-visit/repositories/crm-visit-entity-link-repository";
import { createCrmVisitParticipantRepository } from "@/modules/crm-visit/repositories/crm-visit-participant-repository";
import { createCrmVisitReferenceRepository } from "@/modules/crm-visit/repositories/crm-visit-reference-repository";
import { createCrmVisitRepository } from "@/modules/crm-visit/repositories/crm-visit-repository";
import {
  AUDIT_OPERATIONS,
  recordCrmVisitAudit,
} from "@/modules/crm-visit/services/crm-visit-audit-helper";
import {
  buildVisitNumber,
  canReviewVisit,
  canSubmitVisit,
  hasEntityLinkRequirement,
  isApprovedVisit,
  isOpenActionItemStatus,
  isVisitEditable,
  resolveReportDueAt,
} from "@/modules/crm-visit/services/crm-visit-rules";
import type {
  AddCrmVisitActionItemPayload,
  AddCrmVisitAttendeePayload,
  CreateCrmVisitPayload,
  CrmVisitCustomer360Contribution,
  CrmVisitDashboardView,
  CrmVisitDetailView,
  CrmVisitListFilters,
  CrmVisitRegistrationCatalogues,
  CrmVisitSummaryView,
  ReviewCrmVisitPayload,
  SubmitCrmVisitPayload,
  UpdateCrmVisitActionItemPayload,
  UpdateCrmVisitPayload,
  UpdateCrmVisitReportPayload,
} from "@/modules/crm-visit/types";
import {
  addCrmVisitActionItemSchema,
  addCrmVisitAttendeeSchema,
  createCrmVisitSchema,
  crmVisitListFiltersSchema,
  reviewCrmVisitSchema,
  submitCrmVisitSchema,
  updateCrmVisitActionItemSchema,
  updateCrmVisitReportSchema,
  updateCrmVisitSchema,
} from "@/modules/crm-visit/validators/crm-visit-validators";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";

type VisitRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createCrmVisitRepository>["findById"]>>
>;

export class CrmVisitService {
  constructor(
    private readonly visitRepository = createCrmVisitRepository(),
    private readonly participantRepository = createCrmVisitParticipantRepository(),
    private readonly attendeeRepository = createCrmVisitAttendeeRepository(),
    private readonly actionItemRepository = createCrmVisitActionItemRepository(),
    private readonly entityLinkRepository = createCrmVisitEntityLinkRepository(),
    private readonly documentRepository = createCrmVisitDocumentRepository(),
    private readonly catalogueRepository = createCrmVisitCatalogueRepository(),
    private readonly referenceRepository = createCrmVisitReferenceRepository(),
    private readonly appointmentRepository = createCrmAppointmentRepository(),
    private readonly partyRepository = createPartyRepository(),
    private readonly activityService = createCrmActivityService(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<CrmVisitRegistrationCatalogues> {
    await this.catalogueRepository.ensureDefaults();
    const [owners, visitTypes] = await Promise.all([
      this.referenceRepository.listActiveOwners(context.businessId),
      this.catalogueRepository.listActiveTypes(),
    ]);
    return {
      visitTypes,
      owners: owners.map((row) => ({
        id: row.id,
        displayName:
          row.displayName?.trim() || `${row.firstName} ${row.lastName}`.trim(),
      })),
    };
  }

  async getDashboard(context: CurrentBusinessContext): Promise<CrmVisitDashboardView> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [totalDraft, pendingApproval, myOpen, recentRows, approvedRows] =
      await Promise.all([
        this.visitRepository.countByStatus(context.businessId, [
          CRM_VISIT_STATUS_CODES.DRAFT,
          CRM_VISIT_STATUS_CODES.IN_PROGRESS,
        ]),
        this.visitRepository.countByStatus(context.businessId, [
          CRM_VISIT_STATUS_CODES.SUBMITTED,
        ]),
        this.actionItemRepository.listOpenByOwner(
          context.businessId,
          context.platformUserId
        ),
        this.visitRepository.listRecent(context.businessId, 8),
        this.visitRepository.listByFilters(context.businessId, {
          statusCode: CRM_VISIT_STATUS_CODES.APPROVED,
        }),
      ]);

    const approvedThisMonth = approvedRows.filter(
      (row) => row.approvedAt && row.approvedAt >= monthStart
    ).length;

    return {
      totalDraft,
      pendingApproval,
      myOpenActionItems: myOpen.length,
      approvedThisMonth,
      recentVisits: await Promise.all(
        recentRows.map((row) => this.toSummaryView(context, row))
      ),
    };
  }

  async listVisits(
    context: CurrentBusinessContext,
    filters: CrmVisitListFilters = {}
  ): Promise<CrmVisitSummaryView[]> {
    const parsed = crmVisitListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    const rows = await this.visitRepository.listByFilters(context.businessId, {
      ...parsed.data,
      currentUserId: context.platformUserId,
    });
    return Promise.all(rows.map((row) => this.toSummaryView(context, row)));
  }

  async getVisit(
    context: CurrentBusinessContext,
    visitId: string
  ): Promise<CrmVisitDetailView> {
    const row = await this.visitRepository.findById(context.businessId, visitId);
    if (!row) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, row);
  }

  async createVisit(
    context: CurrentBusinessContext,
    payload: CreateCrmVisitPayload
  ): Promise<CrmVisitDetailView> {
    const parsed = createCrmVisitSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmVisitError(
        "INVALID_INPUT",
        first?.message ?? CRM_VISIT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    if (!hasEntityLinkRequirement(parsed.data.primaryPartyId)) {
      throw new CrmVisitError(
        "ENTITY_LINK_REQUIRED",
        CRM_VISIT_USER_MESSAGES.ENTITY_LINK_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    await this.catalogueRepository.ensureDefaults();
    const visitType = await this.catalogueRepository.findTypeByCode(
      parsed.data.visitTypeCode
    );
    if (!visitType) {
      throw new CrmVisitError(
        "INVALID_CATALOGUE_CODE",
        CRM_VISIT_USER_MESSAGES.INVALID_CATALOGUE_CODE,
        400,
        "visitTypeCode"
      );
    }

    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmVisitError(
        "INACTIVE_OWNER",
        CRM_VISIT_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }

    const party = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      parsed.data.primaryPartyId
    );
    if (!party) {
      throw new CrmVisitError(
        "PARTY_REQUIRED",
        CRM_VISIT_USER_MESSAGES.PARTY_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    if (parsed.data.linkedAppointmentId) {
      const appointment = await this.appointmentRepository.findById(
        context.businessId,
        parsed.data.linkedAppointmentId
      );
      if (!appointment) {
        throw new CrmVisitError(
          "INVALID_INPUT",
          "Linked appointment was not found.",
          400,
          "linkedAppointmentId"
        );
      }
    }

    const db = getDb();
    const sequence = await this.visitRepository.getNextSequenceNumber(
      context.businessId,
      db
    );

    const created = await db.transaction(async (tx) => {
      const row = await this.visitRepository.insert(
        {
          businessId: context.businessId,
          visitNumber: buildVisitNumber(sequence),
          visitTypeCode: parsed.data.visitTypeCode,
          subject: parsed.data.subject,
          statusCode: CRM_VISIT_STATUS_CODES.DRAFT,
          visitDate: new Date(parsed.data.visitDate),
          startTime: parsed.data.startTime
            ? new Date(parsed.data.startTime)
            : null,
          endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
          location: parsed.data.location ?? null,
          objectives: parsed.data.objectives ?? null,
          agenda: parsed.data.agenda ?? null,
          priorityCode: parsed.data.priorityCode ?? "NORMAL",
          ownerUserId: parsed.data.ownerUserId,
          primaryPartyId: parsed.data.primaryPartyId,
          linkedAppointmentId: parsed.data.linkedAppointmentId ?? null,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      await this.participantRepository.insert(
        {
          businessId: context.businessId,
          visitId: row.id,
          userId: parsed.data.ownerUserId,
          isPrimaryAuthor: true,
          createdBy: context.platformUserId,
        },
        tx
      );

      await this.entityLinkRepository.insertMany(
        [
          {
            businessId: context.businessId,
            visitId: row.id,
            entityTypeCode: CRM_VISIT_ENTITY_TYPE_CODES.PARTY,
            entityId: parsed.data.primaryPartyId,
            isPrimary: true,
            createdBy: context.platformUserId,
          },
        ],
        tx
      );

      return row;
    });

    await recordCrmVisitAudit(this.auditService, context, {
      visitId: created.id,
      operation: AUDIT_OPERATIONS.CREATE,
      createValues: {
        visitNumber: created.visitNumber,
        subject: created.subject,
        statusCode: created.statusCode,
      },
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: parsed.data.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.VISIT_PLANNED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT,
        summary: `Visit planned: ${created.subject}`,
        referenceEntity: "crm_visit",
        referenceId: created.id,
      })
    );

    return this.toDetailView(context, created);
  }

  async updateVisit(
    context: CurrentBusinessContext,
    visitId: string,
    payload: UpdateCrmVisitPayload
  ): Promise<CrmVisitDetailView> {
    const parsed = updateCrmVisitSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.requireEditableVisit(context, visitId);
    const updated = await this.visitRepository.updateById(context.businessId, visitId, {
      ...parsed.data,
      startTime: parsed.data.startTime
        ? new Date(parsed.data.startTime)
        : parsed.data.startTime === null
          ? null
          : undefined,
      endTime: parsed.data.endTime
        ? new Date(parsed.data.endTime)
        : parsed.data.endTime === null
          ? null
          : undefined,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
      statusCode:
        existing.statusCode === CRM_VISIT_STATUS_CODES.DRAFT
          ? CRM_VISIT_STATUS_CODES.IN_PROGRESS
          : existing.statusCode,
    });
    if (!updated) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, updated);
  }

  async updateReportSections(
    context: CurrentBusinessContext,
    visitId: string,
    payload: UpdateCrmVisitReportPayload
  ): Promise<CrmVisitDetailView> {
    const parsed = updateCrmVisitReportSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.requireEditableVisit(context, visitId);
    const updated = await this.visitRepository.updateById(context.businessId, visitId, {
      ...parsed.data,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
      statusCode:
        existing.statusCode === CRM_VISIT_STATUS_CODES.DRAFT
          ? CRM_VISIT_STATUS_CODES.IN_PROGRESS
          : existing.statusCode,
    });
    if (!updated) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    return this.toDetailView(context, updated);
  }

  async addAttendee(
    context: CurrentBusinessContext,
    visitId: string,
    payload: AddCrmVisitAttendeePayload
  ): Promise<CrmVisitDetailView> {
    const parsed = addCrmVisitAttendeeSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    await this.requireEditableVisit(context, visitId);
    await this.attendeeRepository.insert({
      businessId: context.businessId,
      visitId,
      ...parsed.data,
      createdBy: context.platformUserId,
    });
    return this.getVisit(context, visitId);
  }

  async addActionItem(
    context: CurrentBusinessContext,
    visitId: string,
    payload: AddCrmVisitActionItemPayload
  ): Promise<CrmVisitDetailView> {
    const parsed = addCrmVisitActionItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    await this.requireEditableVisit(context, visitId);
    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmVisitError(
        "INACTIVE_OWNER",
        CRM_VISIT_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }
    await this.actionItemRepository.insert({
      businessId: context.businessId,
      visitId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      ownerUserId: parsed.data.ownerUserId,
      dueDate: new Date(parsed.data.dueDate),
      priorityCode: parsed.data.priorityCode ?? "NORMAL",
      createdBy: context.platformUserId,
    });
    return this.getVisit(context, visitId);
  }

  async updateActionItem(
    context: CurrentBusinessContext,
    visitId: string,
    actionItemId: string,
    payload: UpdateCrmVisitActionItemPayload
  ): Promise<CrmVisitDetailView> {
    const parsed = updateCrmVisitActionItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    const visit = await this.visitRepository.findById(context.businessId, visitId);
    if (!visit) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    const item = await this.actionItemRepository.findById(
      context.businessId,
      actionItemId
    );
    if (!item || item.visitId !== visitId) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    const isAuthor = visit.ownerUserId === context.platformUserId;
    if (!isAuthor && item.ownerUserId !== context.platformUserId) {
      throw new CrmVisitError(
        "ACTION_ITEM_FORBIDDEN",
        CRM_VISIT_USER_MESSAGES.ACTION_ITEM_FORBIDDEN,
        403
      );
    }
    await this.actionItemRepository.updateById(context.businessId, actionItemId, {
      statusCode: parsed.data.statusCode,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      updatedBy: context.platformUserId,
    });
    return this.getVisit(context, visitId);
  }

  async submitForReview(
    context: CurrentBusinessContext,
    visitId: string,
    payload: SubmitCrmVisitPayload
  ): Promise<CrmVisitDetailView> {
    const parsed = submitCrmVisitSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError("INVALID_INPUT", CRM_VISIT_USER_MESSAGES.INVALID_INPUT);
    }
    const existing = await this.visitRepository.findById(context.businessId, visitId);
    if (!existing) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    if (!canSubmitVisit(existing.statusCode)) {
      throw new CrmVisitError("CANNOT_SUBMIT", CRM_VISIT_USER_MESSAGES.CANNOT_SUBMIT);
    }
    const actionItems = await this.actionItemRepository.listByVisitId(visitId);
    if (actionItems.length === 0) {
      throw new CrmVisitError(
        "ACTION_ITEMS_REQUIRED",
        CRM_VISIT_USER_MESSAGES.ACTION_ITEMS_REQUIRED
      );
    }

    const now = new Date();
    const updated = await this.visitRepository.updateById(context.businessId, visitId, {
      statusCode: CRM_VISIT_STATUS_CODES.SUBMITTED,
      submitterNotes: parsed.data.submitterNotes ?? null,
      submittedAt: now,
      reportDueAt: resolveReportDueAt(
        now,
        CRM_VISIT_SLA_ARCHITECTURE.defaultReportDueHours
      ),
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CALL_REPORT_SUBMITTED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT,
        summary: `Call report submitted: ${existing.subject}`,
        referenceEntity: "crm_visit",
        referenceId: visitId,
      })
    );

    return this.toDetailView(context, updated);
  }

  async approveVisit(
    context: CurrentBusinessContext,
    visitId: string,
    payload: ReviewCrmVisitPayload
  ): Promise<CrmVisitDetailView> {
    const existing = await this.requireReviewableVisit(context, visitId, payload);
    const now = new Date();
    const updated = await this.visitRepository.updateById(context.businessId, visitId, {
      statusCode: CRM_VISIT_STATUS_CODES.APPROVED,
      reviewerComments: payload.reviewerComments,
      approvedAt: now,
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }

    const actionItems = await this.actionItemRepository.listByVisitId(visitId);
    for (const item of actionItems.filter((row) => isOpenActionItemStatus(row.statusCode))) {
      const activity = await this.activityService.createActivity(context, {
        activityTypeCode: CRM_ACTIVITY_TYPE_CODES.TASK,
        subject: item.title,
        description: item.description,
        dueDate: item.dueDate.toISOString(),
        priorityCode: item.priorityCode,
        ownerUserId: item.ownerUserId,
        primaryPartyId: existing.primaryPartyId,
        recordSourceCode: CRM_ACTIVITY_RECORD_SOURCE_CODES.VISIT_ACTION_ITEM,
        sourceReferenceType: "VISIT_ACTION_ITEM",
        sourceReferenceId: item.id,
      });
      await this.actionItemRepository.updateById(context.businessId, item.id, {
        linkedActivityId: activity.id,
        updatedBy: context.platformUserId,
      });
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CALL_REPORT_APPROVED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT,
        summary: `Call report approved: ${existing.subject}`,
        referenceEntity: "crm_visit",
        referenceId: visitId,
      })
    );

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.VISIT_COMPLETED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT,
        summary: `Visit completed: ${existing.subject}`,
        referenceEntity: "crm_visit",
        referenceId: visitId,
      })
    );

    return this.toDetailView(context, updated);
  }

  async returnVisit(
    context: CurrentBusinessContext,
    visitId: string,
    payload: ReviewCrmVisitPayload
  ): Promise<CrmVisitDetailView> {
    const existing = await this.requireReviewableVisit(context, visitId, payload);
    const updated = await this.visitRepository.updateById(context.businessId, visitId, {
      statusCode: CRM_VISIT_STATUS_CODES.RETURNED,
      reviewerComments: payload.reviewerComments,
      returnedAt: new Date(),
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CALL_REPORT_RETURNED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT,
        summary: `Call report returned: ${existing.subject}`,
        referenceEntity: "crm_visit",
        referenceId: visitId,
      })
    );
    return this.toDetailView(context, updated);
  }

  async rejectVisit(
    context: CurrentBusinessContext,
    visitId: string,
    payload: ReviewCrmVisitPayload
  ): Promise<CrmVisitDetailView> {
    const existing = await this.requireReviewableVisit(context, visitId, payload);
    const updated = await this.visitRepository.updateById(context.businessId, visitId, {
      statusCode: CRM_VISIT_STATUS_CODES.REJECTED,
      reviewerComments: payload.reviewerComments,
      rejectedAt: new Date(),
      updatedBy: context.platformUserId,
      version: existing.version + 1,
    });
    if (!updated) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CALL_REPORT_REJECTED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_VISIT,
        summary: `Call report rejected: ${existing.subject}`,
        referenceEntity: "crm_visit",
        referenceId: visitId,
      })
    );
    return this.toDetailView(context, updated);
  }

  async getCustomer360Contribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmVisitCustomer360Contribution> {
    const [recentRows, upcomingRows] = await Promise.all([
      this.visitRepository.listRecentForParty(context.businessId, partyId, 5),
      this.visitRepository.listUpcomingForParty(context.businessId, partyId, 5),
    ]);
    const openActionItems = await this.actionItemRepository.listOpenByPartyVisits(
      recentRows.map((row) => row.id)
    );
    const pendingApprovals = recentRows.filter(
      (row) => row.statusCode === CRM_VISIT_STATUS_CODES.SUBMITTED
    ).length;

    return {
      upcomingVisits: await Promise.all(
        upcomingRows.map((row) => this.toSummaryView(context, row))
      ),
      recentVisits: await Promise.all(
        recentRows.map((row) => this.toSummaryView(context, row))
      ),
      openActionItems: await Promise.all(
        openActionItems.map(async (item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          ownerUserId: item.ownerUserId,
          ownerDisplayName:
            (await this.referenceRepository.getOwnerDisplayName(item.ownerUserId)) ??
            "Unknown",
          dueDate: item.dueDate.toISOString(),
          priorityCode: item.priorityCode,
          statusCode: item.statusCode,
          linkedActivityId: item.linkedActivityId,
        }))
      ),
      pendingApprovals,
    };
  }

  private async requireEditableVisit(
    context: CurrentBusinessContext,
    visitId: string
  ): Promise<VisitRow> {
    const existing = await this.visitRepository.findById(context.businessId, visitId);
    if (!existing) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    if (isApprovedVisit(existing.statusCode) || !isVisitEditable(existing.statusCode)) {
      throw new CrmVisitError(
        "APPROVED_READ_ONLY",
        CRM_VISIT_USER_MESSAGES.APPROVED_READ_ONLY
      );
    }
    return existing;
  }

  private async requireReviewableVisit(
    context: CurrentBusinessContext,
    visitId: string,
    payload: ReviewCrmVisitPayload
  ): Promise<VisitRow> {
    const parsed = reviewCrmVisitSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmVisitError(
        "REVIEWER_COMMENTS_REQUIRED",
        CRM_VISIT_USER_MESSAGES.REVIEWER_COMMENTS_REQUIRED
      );
    }
    const existing = await this.visitRepository.findById(context.businessId, visitId);
    if (!existing) {
      throw new CrmVisitError("NOT_FOUND", CRM_VISIT_USER_MESSAGES.NOT_FOUND, 404);
    }
    if (!canReviewVisit(existing.statusCode)) {
      throw new CrmVisitError("CANNOT_SUBMIT", CRM_VISIT_USER_MESSAGES.CANNOT_SUBMIT);
    }
    return existing;
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: VisitRow
  ): Promise<CrmVisitSummaryView> {
    const [ownerDisplayName, party] = await Promise.all([
      this.referenceRepository.getOwnerDisplayName(row.ownerUserId),
      this.partyRepository.findByIdIncludingArchived(
        context.businessId,
        row.primaryPartyId
      ),
    ]);
    const typeCode = row.visitTypeCode as CrmVisitTypeCode;
    const statusCode = row.statusCode as CrmVisitStatusCode;
    return {
      id: row.id,
      visitNumber: row.visitNumber,
      visitTypeCode: typeCode,
      visitTypeLabel: CRM_VISIT_TYPE_LABELS[typeCode] ?? row.visitTypeCode,
      subject: row.subject,
      statusCode,
      statusLabel: CRM_VISIT_STATUS_LABELS[statusCode] ?? row.statusCode,
      visitDate: row.visitDate.toISOString(),
      ownerUserId: row.ownerUserId,
      ownerDisplayName: ownerDisplayName ?? "Unknown",
      primaryPartyId: row.primaryPartyId,
      primaryPartyDisplayName: party?.displayName ?? "Unknown Party",
      linkedAppointmentId: row.linkedAppointmentId,
      reportDueAt: row.reportDueAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: VisitRow
  ): Promise<CrmVisitDetailView> {
    const [summary, participants, attendees, actionItems, documents, statusMeta] =
      await Promise.all([
        this.toSummaryView(context, row),
        this.participantRepository.listByVisitId(row.id),
        this.attendeeRepository.listByVisitId(row.id),
        this.actionItemRepository.listByVisitId(row.id),
        this.documentRepository.listByVisitId(row.id),
        this.catalogueRepository.findStatusByCode(row.statusCode),
      ]);

    const participantViews = await Promise.all(
      participants.map(async (participant) => ({
        id: participant.id,
        userId: participant.userId,
        displayName:
          (await this.referenceRepository.getOwnerDisplayName(participant.userId)) ??
          "Participant",
        isPrimaryAuthor: participant.isPrimaryAuthor,
      }))
    );

    const actionItemViews = await Promise.all(
      actionItems.map(async (item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        ownerUserId: item.ownerUserId,
        ownerDisplayName:
          (await this.referenceRepository.getOwnerDisplayName(item.ownerUserId)) ??
          "Unknown",
        dueDate: item.dueDate.toISOString(),
        priorityCode: item.priorityCode,
        statusCode: item.statusCode,
        linkedActivityId: item.linkedActivityId,
      }))
    );

    return {
      ...summary,
      location: row.location,
      objectives: row.objectives,
      agenda: row.agenda,
      discussion: row.discussion,
      decisions: row.decisions,
      risks: row.risks,
      nextSteps: row.nextSteps,
      minutesSummary: row.minutesSummary,
      priorityCode: row.priorityCode,
      startTime: row.startTime?.toISOString() ?? null,
      endTime: row.endTime?.toISOString() ?? null,
      submitterNotes: row.submitterNotes,
      reviewerComments: row.reviewerComments,
      isEditable: statusMeta?.isEditable ?? isVisitEditable(row.statusCode),
      participants: participantViews,
      attendees: attendees.map((attendee) => ({
        id: attendee.id,
        displayName: attendee.displayName,
        partyId: attendee.partyId,
        positionTitle: attendee.positionTitle,
        email: attendee.email,
        organisation: attendee.organisation,
        wasPresent: attendee.wasPresent,
      })),
      actionItems: actionItemViews,
      documents: documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        storageKey: doc.storageKey,
      })),
    };
  }
}

export function createCrmVisitService() {
  return new CrmVisitService();
}
