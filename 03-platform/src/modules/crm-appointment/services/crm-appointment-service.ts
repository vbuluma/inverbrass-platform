/**
 * CRM Appointment orchestration.
 * BP-004 / IP-06
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
  CRM_ACTIVITY_OUTCOME_CODES,
  CRM_ACTIVITY_RECORD_SOURCE_CODES,
  CRM_ACTIVITY_TYPE_CODES,
} from "@/modules/crm-activity/constants";
import { createCrmActivityService } from "@/modules/crm-activity/services/crm-activity-service";
import {
  CRM_APPOINTMENT_ENTITY_TYPE_CODES,
  CRM_APPOINTMENT_ENTITY_TYPE_LABELS,
  CRM_APPOINTMENT_LIST_VIEWS,
  CRM_APPOINTMENT_PARTICIPANT_KINDS,
  CRM_APPOINTMENT_RESPONSE_STATUS_CODES,
  CRM_APPOINTMENT_STATUS_CODES,
  CRM_APPOINTMENT_STATUS_LABELS,
  CRM_APPOINTMENT_TYPE_LABELS,
  type CrmAppointmentStatusCode,
  type CrmAppointmentTypeCode,
} from "@/modules/crm-appointment/constants";
import {
  CRM_APPOINTMENT_USER_MESSAGES,
  CrmAppointmentError,
} from "@/modules/crm-appointment/errors";
import { createCrmAppointmentCatalogueRepository } from "@/modules/crm-appointment/repositories/crm-appointment-catalogue-repository";
import { createCrmAppointmentEntityLinkRepository } from "@/modules/crm-appointment/repositories/crm-appointment-entity-link-repository";
import { createCrmAppointmentParticipantRepository } from "@/modules/crm-appointment/repositories/crm-appointment-participant-repository";
import { createCrmAppointmentReferenceRepository } from "@/modules/crm-appointment/repositories/crm-appointment-reference-repository";
import { createCrmAppointmentRepository } from "@/modules/crm-appointment/repositories/crm-appointment-repository";
import {
  AUDIT_OPERATIONS,
  recordCrmAppointmentAudit,
} from "@/modules/crm-appointment/services/crm-appointment-audit-helper";
import {
  buildAppointmentNumber,
  canCancelAppointment,
  canCompleteAppointment,
  canMarkNoShow,
  hasEntityLinkRequirement,
  isAppointmentEditable,
  mapAppointmentTypeToActivityType,
  suggestAlternativeSlots,
  validateEndAfterStart,
} from "@/modules/crm-appointment/services/crm-appointment-rules";
import type {
  CancelCrmAppointmentPayload,
  CompleteCrmAppointmentPayload,
  CreateCrmAppointmentPayload,
  CrmAppointmentAvailabilityCheck,
  CrmAppointmentCustomer360Contribution,
  CrmAppointmentDashboardView,
  CrmAppointmentDetailView,
  CrmAppointmentListFilters,
  CrmAppointmentRegistrationCatalogues,
  CrmAppointmentSummaryView,
  NoShowCrmAppointmentPayload,
  UpdateCrmAppointmentMinutesPayload,
  UpdateCrmAppointmentPayload,
} from "@/modules/crm-appointment/types";
import {
  cancelCrmAppointmentSchema,
  checkCrmAppointmentAvailabilitySchema,
  completeCrmAppointmentSchema,
  createCrmAppointmentSchema,
  crmAppointmentListFiltersSchema,
  noShowCrmAppointmentSchema,
  updateCrmAppointmentMinutesSchema,
  updateCrmAppointmentSchema,
} from "@/modules/crm-appointment/validators/crm-appointment-validators";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";

type AppointmentRow = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof createCrmAppointmentRepository>["findById"]>
  >
>;

export class CrmAppointmentService {
  constructor(
    private readonly appointmentRepository = createCrmAppointmentRepository(),
    private readonly participantRepository = createCrmAppointmentParticipantRepository(),
    private readonly entityLinkRepository = createCrmAppointmentEntityLinkRepository(),
    private readonly catalogueRepository = createCrmAppointmentCatalogueRepository(),
    private readonly referenceRepository = createCrmAppointmentReferenceRepository(),
    private readonly partyRepository = createPartyRepository(),
    private readonly activityService = createCrmActivityService(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<CrmAppointmentRegistrationCatalogues> {
    await this.catalogueRepository.ensureDefaults();

    const [owners, appointmentTypes] = await Promise.all([
      this.referenceRepository.listActiveOwners(context.businessId),
      this.catalogueRepository.listActiveTypes(),
    ]);

    return {
      appointmentTypes: appointmentTypes.map((row) => ({
        code: row.code,
        name: row.name,
        defaultDurationMinutes: row.defaultDurationMinutes,
      })),
      owners: owners.map((row) => ({
        id: row.id,
        displayName:
          row.displayName?.trim() ||
          `${row.firstName} ${row.lastName}`.trim(),
      })),
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<CrmAppointmentDashboardView> {
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalScheduled,
      myScheduled,
      upcomingRows,
      completedThisMonth,
      noShowThisMonth,
      recentRows,
      calendarRows,
    ] = await Promise.all([
      this.appointmentRepository.countByStatus(context.businessId, [
        CRM_APPOINTMENT_STATUS_CODES.SCHEDULED,
      ]),
      this.appointmentRepository.countOwnedByStatus(
        context.businessId,
        context.platformUserId,
        [CRM_APPOINTMENT_STATUS_CODES.SCHEDULED]
      ),
      this.appointmentRepository.listByFilters(context.businessId, {
        upcomingOnly: true,
        startFrom: now,
        startTo: weekEnd,
      }),
      this.appointmentRepository.listByFilters(context.businessId, {
        statusCode: CRM_APPOINTMENT_STATUS_CODES.COMPLETED,
        startFrom: monthStart,
      }),
      this.appointmentRepository.listByFilters(context.businessId, {
        statusCode: CRM_APPOINTMENT_STATUS_CODES.NO_SHOW,
        startFrom: monthStart,
      }),
      this.appointmentRepository.listRecent(context.businessId, 8),
      this.appointmentRepository.listByFilters(context.businessId, {
        view: CRM_APPOINTMENT_LIST_VIEWS.CALENDAR,
        currentUserId: context.platformUserId,
        startFrom: now,
        startTo: weekEnd,
      }),
    ]);

    const [recentAppointments, calendarWeek] = await Promise.all([
      Promise.all(recentRows.map((row) => this.toSummaryView(context, row))),
      Promise.all(calendarRows.map((row) => this.toSummaryView(context, row))),
    ]);

    return {
      totalScheduled,
      myScheduled,
      upcomingThisWeek: upcomingRows.length,
      completedThisMonth: completedThisMonth.length,
      noShowThisMonth: noShowThisMonth.length,
      recentAppointments,
      calendarWeek,
    };
  }

  async listAppointments(
    context: CurrentBusinessContext,
    filters: CrmAppointmentListFilters = {}
  ): Promise<CrmAppointmentSummaryView[]> {
    const parsed = crmAppointmentListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        first?.message ?? CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const rows = await this.appointmentRepository.listByFilters(
      context.businessId,
      {
        view: parsed.data.view,
        currentUserId: context.platformUserId,
        appointmentTypeCode: parsed.data.appointmentTypeCode,
        statusCode: parsed.data.statusCode,
        ownerUserId: parsed.data.ownerUserId,
        primaryPartyId: parsed.data.primaryPartyId,
        startFrom: parsed.data.startFrom
          ? new Date(parsed.data.startFrom)
          : undefined,
        startTo: parsed.data.startTo ? new Date(parsed.data.startTo) : undefined,
        search: parsed.data.search,
        upcomingOnly: parsed.data.view === CRM_APPOINTMENT_LIST_VIEWS.UPCOMING,
      }
    );

    return Promise.all(rows.map((row) => this.toSummaryView(context, row)));
  }

  async getAppointment(
    context: CurrentBusinessContext,
    appointmentId: string
  ): Promise<CrmAppointmentDetailView> {
    const row = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId
    );

    if (!row) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    return this.toDetailView(context, row);
  }

  async createAppointment(
    context: CurrentBusinessContext,
    payload: CreateCrmAppointmentPayload
  ): Promise<CrmAppointmentDetailView> {
    const parsed = createCrmAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        first?.message ?? CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
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
      throw new CrmAppointmentError(
        "ENTITY_LINK_REQUIRED",
        CRM_APPOINTMENT_USER_MESSAGES.ENTITY_LINK_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    await this.catalogueRepository.ensureDefaults();

    const appointmentType = await this.catalogueRepository.findTypeByCode(
      parsed.data.appointmentTypeCode
    );
    if (!appointmentType) {
      throw new CrmAppointmentError(
        "INVALID_CATALOGUE_CODE",
        CRM_APPOINTMENT_USER_MESSAGES.INVALID_CATALOGUE_CODE,
        400,
        "appointmentTypeCode"
      );
    }

    const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
      context.businessId,
      parsed.data.ownerUserId
    );
    if (!ownerAssignable) {
      throw new CrmAppointmentError(
        "INACTIVE_OWNER",
        CRM_APPOINTMENT_USER_MESSAGES.INACTIVE_OWNER,
        400,
        "ownerUserId"
      );
    }

    const startDateTime = new Date(parsed.data.startDateTime);
    const endDateTime = new Date(parsed.data.endDateTime);
    const windowError = validateEndAfterStart(startDateTime, endDateTime);
    if (windowError) {
      throw new CrmAppointmentError(
        "END_BEFORE_START",
        CRM_APPOINTMENT_USER_MESSAGES.END_BEFORE_START,
        400,
        "endDateTime"
      );
    }

    const availability = await this.checkAvailability(context, {
      ownerUserId: parsed.data.ownerUserId,
      startDateTime: parsed.data.startDateTime,
      endDateTime: parsed.data.endDateTime,
    });
    if (!availability.available) {
      const suggestion = availability.suggestedSlots[0];
      throw new CrmAppointmentError(
        "SCHEDULING_CONFLICT",
        suggestion
          ? `Owner has a conflicting appointment. Try ${suggestion.startDateTime} – ${suggestion.endDateTime}.`
          : "Owner has a conflicting appointment in this time window.",
        409,
        "startDateTime"
      );
    }

    const party = await this.partyRepository.findByIdIncludingArchived(
      context.businessId,
      parsed.data.primaryPartyId
    );
    if (!party) {
      throw new CrmAppointmentError(
        "PARTY_REQUIRED",
        CRM_APPOINTMENT_USER_MESSAGES.PARTY_REQUIRED,
        400,
        "primaryPartyId"
      );
    }

    const db = getDb();
    const sequence = await this.appointmentRepository.getNextSequenceNumber(
      context.businessId,
      db
    );
    const appointmentNumber = buildAppointmentNumber(sequence);

    const created = await db.transaction(async (tx) => {
      const row = await this.appointmentRepository.insert(
        {
          businessId: context.businessId,
          appointmentNumber,
          appointmentTypeCode: parsed.data.appointmentTypeCode,
          subject: parsed.data.subject,
          description: parsed.data.description ?? null,
          statusCode: CRM_APPOINTMENT_STATUS_CODES.SCHEDULED,
          startDateTime,
          endDateTime,
          location: parsed.data.location ?? null,
          virtualMeetingUrl: parsed.data.virtualMeetingUrl ?? null,
          ownerUserId: parsed.data.ownerUserId,
          primaryPartyId: parsed.data.primaryPartyId,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );

      const participantRows = [
        {
          businessId: context.businessId,
          appointmentId: row.id,
          participantKind: CRM_APPOINTMENT_PARTICIPANT_KINDS.INTERNAL,
          userId: parsed.data.ownerUserId,
          displayName: null,
          responseStatusCode: CRM_APPOINTMENT_RESPONSE_STATUS_CODES.ACCEPTED,
          isOrganizer: true,
          createdBy: context.platformUserId,
        },
        ...(parsed.data.participants ?? []).map((participant) => ({
          businessId: context.businessId,
          appointmentId: row.id,
          participantKind: participant.participantKind,
          userId: participant.userId ?? null,
          externalPartyId: participant.externalPartyId ?? null,
          displayName: participant.displayName ?? null,
          responseStatusCode:
            participant.responseStatusCode ??
            CRM_APPOINTMENT_RESPONSE_STATUS_CODES.INVITED,
          isOrganizer: participant.isOrganizer ?? false,
          createdBy: context.platformUserId,
        })),
      ];

      await this.participantRepository.insertMany(participantRows, tx);

      const links = [
        {
          businessId: context.businessId,
          appointmentId: row.id,
          entityTypeCode: CRM_APPOINTMENT_ENTITY_TYPE_CODES.PARTY,
          entityId: parsed.data.primaryPartyId,
          isPrimary: true,
          createdBy: context.platformUserId,
        },
        ...(parsed.data.entityLinks ?? []).map((link) => ({
          businessId: context.businessId,
          appointmentId: row.id,
          entityTypeCode: link.entityTypeCode,
          entityId: link.entityId,
          isPrimary: link.isPrimary ?? false,
          createdBy: context.platformUserId,
        })),
      ];

      await this.entityLinkRepository.insertMany(links, tx);

      return row;
    });

    await recordCrmAppointmentAudit(this.auditService, context, {
      appointmentId: created.id,
      operation: AUDIT_OPERATIONS.CREATE,
      createValues: {
        appointmentNumber: created.appointmentNumber,
        subject: created.subject,
        statusCode: created.statusCode,
      },
    });

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: parsed.data.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.APPOINTMENT_SCHEDULED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_APPOINTMENT,
        summary: `Appointment scheduled: ${created.subject}`,
        referenceEntity: "crm_appointment",
        referenceId: created.id,
        metadata: {
          appointmentNumber: created.appointmentNumber,
          startDateTime: created.startDateTime.toISOString(),
        },
      })
    );

    return this.toDetailView(context, created);
  }

  async updateAppointment(
    context: CurrentBusinessContext,
    appointmentId: string,
    payload: UpdateCrmAppointmentPayload
  ): Promise<CrmAppointmentDetailView> {
    const parsed = updateCrmAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        first?.message ?? CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const existing = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId
    );
    if (!existing) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!isAppointmentEditable(existing.statusCode)) {
      throw new CrmAppointmentError(
        "TERMINAL_READ_ONLY",
        CRM_APPOINTMENT_USER_MESSAGES.TERMINAL_READ_ONLY,
        400
      );
    }

    const startDateTime = parsed.data.startDateTime
      ? new Date(parsed.data.startDateTime)
      : existing.startDateTime;
    const endDateTime = parsed.data.endDateTime
      ? new Date(parsed.data.endDateTime)
      : existing.endDateTime;

    const windowError = validateEndAfterStart(startDateTime, endDateTime);
    if (windowError) {
      throw new CrmAppointmentError(
        "END_BEFORE_START",
        CRM_APPOINTMENT_USER_MESSAGES.END_BEFORE_START,
        400,
        "endDateTime"
      );
    }

    if (parsed.data.ownerUserId) {
      const ownerAssignable = await this.referenceRepository.isOwnerAssignable(
        context.businessId,
        parsed.data.ownerUserId
      );
      if (!ownerAssignable) {
        throw new CrmAppointmentError(
          "INACTIVE_OWNER",
          CRM_APPOINTMENT_USER_MESSAGES.INACTIVE_OWNER,
          400,
          "ownerUserId"
        );
      }
    }

    const updated = await this.appointmentRepository.updateById(
      context.businessId,
      appointmentId,
      {
        subject: parsed.data.subject,
        description: parsed.data.description,
        startDateTime: parsed.data.startDateTime ? startDateTime : undefined,
        endDateTime: parsed.data.endDateTime ? endDateTime : undefined,
        location: parsed.data.location,
        virtualMeetingUrl: parsed.data.virtualMeetingUrl,
        ownerUserId: parsed.data.ownerUserId,
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!updated) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (
      parsed.data.startDateTime ||
      parsed.data.endDateTime
    ) {
      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: existing.primaryPartyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.APPOINTMENT_RESCHEDULED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_APPOINTMENT,
          summary: `Appointment rescheduled: ${updated.subject}`,
          referenceEntity: "crm_appointment",
          referenceId: updated.id,
          metadata: {
            startDateTime: updated.startDateTime.toISOString(),
            endDateTime: updated.endDateTime.toISOString(),
          },
        })
      );
    }

    return this.toDetailView(context, updated);
  }

  async cancelAppointment(
    context: CurrentBusinessContext,
    appointmentId: string,
    payload: CancelCrmAppointmentPayload
  ): Promise<CrmAppointmentDetailView> {
    const parsed = cancelCrmAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const existing = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId
    );
    if (!existing) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!canCancelAppointment(existing.statusCode)) {
      throw new CrmAppointmentError(
        "ALREADY_TERMINAL",
        CRM_APPOINTMENT_USER_MESSAGES.ALREADY_TERMINAL,
        400
      );
    }

    const updated = await this.appointmentRepository.updateById(
      context.businessId,
      appointmentId,
      {
        statusCode: CRM_APPOINTMENT_STATUS_CODES.CANCELLED,
        cancelReason: parsed.data.cancelReason,
        cancelledAt: new Date(),
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!updated) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.APPOINTMENT_CANCELLED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_APPOINTMENT,
        summary: `Appointment cancelled: ${existing.subject}`,
        referenceEntity: "crm_appointment",
        referenceId: appointmentId,
        metadata: { cancelReason: parsed.data.cancelReason },
      })
    );

    return this.toDetailView(context, updated);
  }

  async completeAppointment(
    context: CurrentBusinessContext,
    appointmentId: string,
    payload: CompleteCrmAppointmentPayload
  ): Promise<CrmAppointmentDetailView> {
    const parsed = completeCrmAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const existing = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId
    );
    if (!existing) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!canCompleteAppointment(existing.statusCode)) {
      throw new CrmAppointmentError(
        "ALREADY_TERMINAL",
        CRM_APPOINTMENT_USER_MESSAGES.ALREADY_TERMINAL,
        400
      );
    }

    const activityTypeCode = mapAppointmentTypeToActivityType(
      existing.appointmentTypeCode
    );

    const activity = await this.activityService.createActivity(context, {
      activityTypeCode,
      subject: existing.subject,
      description: existing.description,
      scheduledStart: existing.startDateTime.toISOString(),
      scheduledEnd: existing.endDateTime.toISOString(),
      dueDate: existing.endDateTime.toISOString(),
      ownerUserId: existing.ownerUserId,
      primaryPartyId: existing.primaryPartyId,
      recordSourceCode: CRM_ACTIVITY_RECORD_SOURCE_CODES.APPOINTMENT,
      sourceReferenceType: "APPOINTMENT",
      sourceReferenceId: existing.id,
    });

    await this.activityService.completeActivity(context, activity.id, {
      outcomeCode: CRM_ACTIVITY_OUTCOME_CODES.COMPLETED,
      outcomeNotes: parsed.data.outcomeNotes ?? null,
    });

    const updated = await this.appointmentRepository.updateById(
      context.businessId,
      appointmentId,
      {
        statusCode: CRM_APPOINTMENT_STATUS_CODES.COMPLETED,
        linkedActivityId: activity.id,
        outcomeNotes: parsed.data.outcomeNotes ?? null,
        completedAt: new Date(),
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!updated) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.APPOINTMENT_COMPLETED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_APPOINTMENT,
        summary: `Appointment completed: ${existing.subject}`,
        referenceEntity: "crm_appointment",
        referenceId: appointmentId,
        metadata: { linkedActivityId: activity.id },
      })
    );

    return this.toDetailView(context, updated);
  }

  async markNoShow(
    context: CurrentBusinessContext,
    appointmentId: string,
    payload: NoShowCrmAppointmentPayload
  ): Promise<CrmAppointmentDetailView> {
    const parsed = noShowCrmAppointmentSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const existing = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId
    );
    if (!existing) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!canMarkNoShow(existing.statusCode)) {
      throw new CrmAppointmentError(
        "ALREADY_TERMINAL",
        CRM_APPOINTMENT_USER_MESSAGES.ALREADY_TERMINAL,
        400
      );
    }

    const updated = await this.appointmentRepository.updateById(
      context.businessId,
      appointmentId,
      {
        statusCode: CRM_APPOINTMENT_STATUS_CODES.NO_SHOW,
        noShowReason: parsed.data.noShowReason,
        noShowAt: new Date(),
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!updated) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (parsed.data.suggestFollowUpTask) {
      await this.activityService.createActivity(context, {
        activityTypeCode: CRM_ACTIVITY_TYPE_CODES.FOLLOW_UP,
        subject: `Follow up: ${existing.subject} (no-show)`,
        description: parsed.data.noShowReason,
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        ownerUserId: existing.ownerUserId,
        primaryPartyId: existing.primaryPartyId,
        recordSourceCode: CRM_ACTIVITY_RECORD_SOURCE_CODES.APPOINTMENT,
        sourceReferenceType: "APPOINTMENT",
        sourceReferenceId: existing.id,
      });
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.primaryPartyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.APPOINTMENT_NO_SHOW,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.ENGAGEMENT,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM_APPOINTMENT,
        summary: `Appointment no-show: ${existing.subject}`,
        referenceEntity: "crm_appointment",
        referenceId: appointmentId,
        metadata: { noShowReason: parsed.data.noShowReason },
      })
    );

    return this.toDetailView(context, updated);
  }

  async getCustomer360Contribution(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmAppointmentCustomer360Contribution> {
    const [upcomingRows, recentRows] = await Promise.all([
      this.appointmentRepository.listUpcomingForParty(
        context.businessId,
        partyId,
        5
      ),
      this.appointmentRepository.listByFilters(context.businessId, {
        primaryPartyId: partyId,
      }),
    ]);

    const recentSlice = recentRows.slice(-5).reverse();

    const [upcomingAppointments, recentAppointments] = await Promise.all([
      Promise.all(upcomingRows.map((row) => this.toSummaryView(context, row))),
      Promise.all(recentSlice.map((row) => this.toSummaryView(context, row))),
    ]);

    return {
      upcomingAppointments,
      recentAppointments,
      upcomingCount: upcomingAppointments.length,
    };
  }

  async checkAvailability(
    context: CurrentBusinessContext,
    input: {
      ownerUserId: string;
      startDateTime: string;
      endDateTime: string;
      excludeAppointmentId?: string;
    }
  ): Promise<CrmAppointmentAvailabilityCheck> {
    const parsed = checkCrmAppointmentAvailabilitySchema.safeParse(input);
    if (!parsed.success) {
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const start = new Date(parsed.data.startDateTime);
    const end = new Date(parsed.data.endDateTime);
    const windowError = validateEndAfterStart(start, end);
    if (windowError) {
      throw new CrmAppointmentError(
        "END_BEFORE_START",
        CRM_APPOINTMENT_USER_MESSAGES.END_BEFORE_START,
        400,
        "endDateTime"
      );
    }

    const conflicts = await this.appointmentRepository.findOwnerConflicts(
      context.businessId,
      parsed.data.ownerUserId,
      start,
      end,
      parsed.data.excludeAppointmentId
    );

    const durationMs = end.getTime() - start.getTime();
    const suggested = suggestAlternativeSlots(
      start,
      durationMs,
      conflicts.map((row) => row.endDateTime)
    );

    return {
      available: conflicts.length === 0,
      conflicts: conflicts.map((row) => ({
        id: row.id,
        subject: row.subject,
        startDateTime: row.startDateTime.toISOString(),
        endDateTime: row.endDateTime.toISOString(),
      })),
      suggestedSlots: suggested.map((slot) => ({
        startDateTime: slot.start.toISOString(),
        endDateTime: slot.end.toISOString(),
      })),
    };
  }

  async updateMinutes(
    context: CurrentBusinessContext,
    appointmentId: string,
    payload: UpdateCrmAppointmentMinutesPayload
  ): Promise<CrmAppointmentDetailView> {
    const parsed = updateCrmAppointmentMinutesSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmAppointmentError(
        "INVALID_INPUT",
        CRM_APPOINTMENT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const existing = await this.appointmentRepository.findById(
      context.businessId,
      appointmentId
    );
    if (!existing) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    if (!isAppointmentEditable(existing.statusCode)) {
      throw new CrmAppointmentError(
        "TERMINAL_READ_ONLY",
        CRM_APPOINTMENT_USER_MESSAGES.TERMINAL_READ_ONLY,
        400
      );
    }

    const updated = await this.appointmentRepository.updateById(
      context.businessId,
      appointmentId,
      {
        meetingNotes: parsed.data.meetingNotes,
        decisions: parsed.data.decisions,
        actionItemsSummary: parsed.data.actionItemsSummary,
        updatedBy: context.platformUserId,
        version: existing.version + 1,
      }
    );

    if (!updated) {
      throw new CrmAppointmentError(
        "NOT_FOUND",
        CRM_APPOINTMENT_USER_MESSAGES.NOT_FOUND,
        404
      );
    }

    return this.toDetailView(context, updated);
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: AppointmentRow
  ): Promise<CrmAppointmentSummaryView> {
    const [ownerDisplayName, party] = await Promise.all([
      this.referenceRepository.getOwnerDisplayName(row.ownerUserId),
      this.partyRepository.findByIdIncludingArchived(
        context.businessId,
        row.primaryPartyId
      ),
    ]);

    const typeCode = row.appointmentTypeCode as CrmAppointmentTypeCode;
    const statusCode = row.statusCode as CrmAppointmentStatusCode;

    return {
      id: row.id,
      appointmentNumber: row.appointmentNumber,
      appointmentTypeCode: typeCode,
      appointmentTypeLabel:
        CRM_APPOINTMENT_TYPE_LABELS[typeCode] ?? row.appointmentTypeCode,
      subject: row.subject,
      statusCode,
      statusLabel:
        CRM_APPOINTMENT_STATUS_LABELS[statusCode] ?? row.statusCode,
      startDateTime: row.startDateTime.toISOString(),
      endDateTime: row.endDateTime.toISOString(),
      location: row.location,
      ownerUserId: row.ownerUserId,
      ownerDisplayName: ownerDisplayName ?? "Unknown",
      primaryPartyId: row.primaryPartyId,
      primaryPartyDisplayName: party?.displayName ?? "Unknown Party",
      linkedActivityId: row.linkedActivityId,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: AppointmentRow
  ): Promise<CrmAppointmentDetailView> {
    const [summary, participants, entityLinks, statusMeta] = await Promise.all([
      this.toSummaryView(context, row),
      this.participantRepository.listByAppointmentId(
        context.businessId,
        row.id
      ),
      this.entityLinkRepository.listByAppointmentId(
        context.businessId,
        row.id
      ),
      this.catalogueRepository.findStatusByCode(row.statusCode),
    ]);

    return {
      ...summary,
      description: row.description,
      virtualMeetingUrl: row.virtualMeetingUrl,
      cancelReason: row.cancelReason,
      noShowReason: row.noShowReason,
      outcomeNotes: row.outcomeNotes,
      meetingNotes: row.meetingNotes,
      decisions: row.decisions,
      actionItemsSummary: row.actionItemsSummary,
      completedAt: row.completedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      noShowAt: row.noShowAt?.toISOString() ?? null,
      isEditable: statusMeta?.isEditable ?? isAppointmentEditable(row.statusCode),
      participants: participants.map((participant) => ({
        id: participant.id,
        participantKind: participant.participantKind,
        userId: participant.userId,
        externalPartyId: participant.externalPartyId,
        displayName: participant.displayName ?? "Participant",
        responseStatusCode: participant.responseStatusCode,
        isOrganizer: participant.isOrganizer,
      })),
      entityLinks: entityLinks.map((link) => ({
        id: link.id,
        entityTypeCode: link.entityTypeCode,
        entityTypeLabel:
          CRM_APPOINTMENT_ENTITY_TYPE_LABELS[
            link.entityTypeCode as keyof typeof CRM_APPOINTMENT_ENTITY_TYPE_LABELS
          ] ?? link.entityTypeCode,
        entityId: link.entityId,
        isPrimary: link.isPrimary,
      })),
    };
  }
}

export function createCrmAppointmentService() {
  return new CrmAppointmentService();
}
