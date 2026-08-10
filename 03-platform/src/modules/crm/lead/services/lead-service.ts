/**
 * Purpose:
 * Lead Management orchestration — capture, qualify, assign, convert.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildTimelineEventFromContext,
  createPartyTimelineService,
  PARTY_TIMELINE_EVENT_CATEGORIES,
  PARTY_TIMELINE_EVENT_TYPES,
  PARTY_TIMELINE_SOURCE_MODULES,
} from "@/core/party-timeline";
import {
  createWorkAssignmentService,
  WORK_ASSIGNMENT_TYPES,
  WORK_OWNER_TYPES,
  WORK_SUBJECT_TYPES,
} from "@/core/work-assignment-sla";
import { createCrmRecordRepository } from "@/modules/crm/repositories/crm-record-repository";
import { createCrmReferenceRepository } from "@/modules/crm/repositories/crm-reference-repository";
import { recordCrmEntityAudit } from "@/modules/crm/services/crm-audit-helper";
import {
  formatCustomerNumber,
  inferCrmTypeFromPartyType,
} from "@/modules/crm/services/crm-rules";
import {
  LEAD_CHANNEL_CODES,
  LEAD_DEFAULT_PAGE_SIZE,
  LEAD_STATUS_CODES,
} from "@/modules/crm/lead/constants";
import { LeadError, LEAD_USER_MESSAGES } from "@/modules/crm/lead/errors";
import {
  createLeadReferenceRepository,
} from "@/modules/crm/lead/repositories/lead-reference-repository";
import {
  createLeadRepository,
  type LeadJoinedRow,
} from "@/modules/crm/lead/repositories/lead-repository";
import {
  canTransitionLeadStatus,
  formatLeadNumber,
  isLeadEditable,
  isLeadStatusCode,
  resolveLeadStatusTone,
} from "@/modules/crm/lead/services/lead-rules";
import type {
  ActiveLeadWidgetSummary,
  CreateLeadPayload,
  LeadConvertPayload,
  LeadDashboardView,
  LeadDetailView,
  LeadDisqualifyPayload,
  LeadListFilters,
  LeadListView,
  LeadRegistrationCatalogues,
  LeadStatusTransitionPayload,
  LeadSummaryView,
  UpdateLeadPayload,
} from "@/modules/crm/lead/types";
import { createBusinessConfigurationRepository } from "@/modules/business/onboarding/repositories/business-configuration-repository";
import {
  resolveLeadQualificationConfig,
  validateQualificationTransition,
} from "@/modules/crm/lead/services/lead-qualification-config";
import { resolveLeadConversionConfig } from "@/modules/crm/lead/services/lead-conversion-config";
import { createOpportunityService } from "@/modules/crm/opportunity/services/opportunity-service";
import {
  createLeadSchema,
  leadConvertSchema,
  leadListFiltersSchema,
  leadSearchQuerySchema,
  leadStatusTransitionSchema,
  updateLeadSchema,
} from "@/modules/crm/lead/validators/lead-validators";

export class LeadService {
  constructor(
    private readonly leadRepository = createLeadRepository(),
    private readonly leadReferenceRepository = createLeadReferenceRepository(),
    private readonly crmReferenceRepository = createCrmReferenceRepository(),
    private readonly crmRepository = createCrmRecordRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly workAssignmentService = createWorkAssignmentService(),
    private readonly businessConfigurationRepository = createBusinessConfigurationRepository(),
    private readonly opportunityService = createOpportunityService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<LeadRegistrationCatalogues> {
    const [leadStatuses, leadSources, disqualificationReasons, branches, ownerParties] =
      await Promise.all([
        this.leadReferenceRepository.listActiveLeadStatuses(),
        this.leadReferenceRepository.listActiveLeadSources(),
        this.leadReferenceRepository.listActiveDisqualificationReasons(),
        this.crmReferenceRepository.listBranchOptions(context.businessId),
        this.crmReferenceRepository.listOwnerPartyOptions(context.businessId),
      ]);

    if (leadStatuses.length === 0 || leadSources.length === 0) {
      throw new LeadError(
        "REFERENCE_DATA_MISSING",
        LEAD_USER_MESSAGES.REFERENCE_DATA_MISSING,
        503
      );
    }

    return {
      leadStatuses,
      leadSources,
      disqualificationReasons,
      branches,
      ownerParties,
      channels: Object.entries(LEAD_CHANNEL_CODES).map(([code, value]) => ({
        code: value,
        name: code
          .split("_")
          .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
          .join(" "),
      })),
    };
  }

  async getDashboard(context: CurrentBusinessContext): Promise<LeadDashboardView> {
    const [
      totalLeads,
      newCount,
      contactedCount,
      qualifiedCount,
      convertedCount,
      unqualifiedCount,
      recentRows,
      statusGroups,
      sourceGroups,
      statuses,
      sources,
    ] = await Promise.all([
      this.leadRepository.countByBusinessId(context.businessId),
      this.leadRepository.countByStatus(context.businessId, LEAD_STATUS_CODES.NEW),
      this.leadRepository.countByStatus(
        context.businessId,
        LEAD_STATUS_CODES.CONTACTED
      ),
      this.leadRepository.countByStatus(
        context.businessId,
        LEAD_STATUS_CODES.QUALIFIED
      ),
      this.leadRepository.countByStatus(
        context.businessId,
        LEAD_STATUS_CODES.CONVERTED
      ),
      this.leadRepository.countByStatus(
        context.businessId,
        LEAD_STATUS_CODES.UNQUALIFIED
      ),
      this.leadRepository.listRecentlyUpdatedByBusinessId(context.businessId, 8),
      this.leadRepository.countGroupedByStatus(context.businessId),
      this.leadRepository.countGroupedBySource(context.businessId),
      this.leadReferenceRepository.listActiveLeadStatuses(),
      this.leadReferenceRepository.listActiveLeadSources(),
    ]);

    const statusNameByCode = new Map(statuses.map((s) => [s.code, s.name]));
    const sourceNameByCode = new Map(sources.map((s) => [s.code, s.name]));

    const recentlyUpdated = await Promise.all(
      recentRows.map((row) => this.toSummaryView(context, row))
    );

    return {
      totalLeads,
      newCount,
      contactedCount,
      qualifiedCount,
      convertedCount,
      unqualifiedCount,
      recentlyUpdated,
      statusSummary: statusGroups.map((group) => ({
        statusCode: group.statusCode,
        statusName: statusNameByCode.get(group.statusCode) ?? group.statusCode,
        count: Number(group.total),
      })),
      sourceSummary: sourceGroups.map((group) => ({
        sourceCode: group.sourceCode,
        sourceName: sourceNameByCode.get(group.sourceCode) ?? group.sourceCode,
        count: Number(group.total),
      })),
    };
  }

  async createLead(
    context: CurrentBusinessContext,
    payload: CreateLeadPayload
  ): Promise<LeadDetailView> {
    const parsed = createLeadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LeadError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid lead input.",
        400
      );
    }

    const input = parsed.data;
    const party = await this.crmReferenceRepository.findParty(
      context.businessId,
      input.partyId
    );

    if (!party) {
      throw new LeadError("PARTY_NOT_FOUND", "The selected party was not found.", 404);
    }

    const activeLead = await this.leadRepository.findActiveByPartyId(
      context.businessId,
      input.partyId
    );

    if (activeLead) {
      throw new LeadError(
        "DUPLICATE_ACTIVE_LEAD",
        LEAD_USER_MESSAGES.DUPLICATE_ACTIVE_LEAD,
        409
      );
    }

    if (!(await this.leadReferenceRepository.isActiveLeadSource(input.sourceCode))) {
      throw new LeadError("INVALID_INPUT", "The selected lead source is invalid.", 400);
    }

    const sequence = await this.leadRepository.nextLeadSequence(context.businessId);
    const leadNumber = formatLeadNumber(sequence);

    const row = await this.leadRepository.insert({
      businessId: context.businessId,
      partyId: input.partyId,
      leadNumber,
      statusCode: LEAD_STATUS_CODES.NEW,
      sourceCode: input.sourceCode,
      channelCode: input.channelCode ?? null,
      ownerPartyId: input.ownerPartyId ?? null,
      branchId: input.branchId ?? null,
      companyName: input.companyName ?? null,
      contactName: input.contactName ?? null,
      email: input.email || null,
      phone: input.phone ?? null,
      notes: input.notes ?? null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    if (row.ownerPartyId) {
      await this.workAssignmentService.assign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_LEAD,
        subjectId: row.id,
        ownerType: WORK_OWNER_TYPES.PARTY,
        ownerId: row.ownerPartyId,
        ownerPartyId: row.ownerPartyId,
        assignmentType: WORK_ASSIGNMENT_TYPES.MANUAL,
        reasonCode: "INITIAL_OWNER",
      });
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: row.partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.LEAD_CREATED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary: `Lead created — ${leadNumber}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_LEAD,
        referenceId: row.id,
        metadata: { leadNumber, sourceCode: input.sourceCode },
      })
    );

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: row.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_LEAD,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      createValues: {
        leadNumber,
        statusCode: LEAD_STATUS_CODES.NEW,
        sourceCode: input.sourceCode,
        partyId: row.partyId,
      },
    });

    return this.getLead(context, row.id);
  }

  async getLead(
    context: CurrentBusinessContext,
    leadId: string
  ): Promise<LeadDetailView> {
    const row = await this.requireJoinedRow(context, leadId);
    return this.toDetailView(context, row);
  }

  async listLeads(
    context: CurrentBusinessContext,
    filters: LeadListFilters
  ): Promise<LeadListView> {
    const parsed = leadListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new LeadError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid list filters.",
        400
      );
    }

    const limit = parsed.data.limit ?? LEAD_DEFAULT_PAGE_SIZE;
    const offset = parsed.data.offset ?? 0;
    const { items, total } = await this.leadRepository.listByFilters(
      context.businessId,
      { ...parsed.data, limit, offset }
    );

    return {
      items: await Promise.all(items.map((row) => this.toSummaryView(context, row))),
      total,
      limit,
      offset,
    };
  }

  async searchLeads(
    context: CurrentBusinessContext,
    query: string
  ): Promise<LeadSummaryView[]> {
    const parsed = leadSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new LeadError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid search query.",
        400
      );
    }

    const { items } = await this.leadRepository.listByFilters(context.businessId, {
      search: parsed.data,
      limit: 25,
    });

    return Promise.all(items.map((row) => this.toSummaryView(context, row)));
  }

  async updateLead(
    context: CurrentBusinessContext,
    leadId: string,
    payload: UpdateLeadPayload
  ): Promise<LeadDetailView> {
    const parsed = updateLeadSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LeadError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid lead input.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, leadId);

    if (!isLeadEditable(existing.statusCode)) {
      throw new LeadError("LEAD_READ_ONLY", LEAD_USER_MESSAGES.LEAD_READ_ONLY, 409);
    }

    if (
      parsed.data.sourceCode &&
      !(await this.leadReferenceRepository.isActiveLeadSource(parsed.data.sourceCode))
    ) {
      throw new LeadError("INVALID_INPUT", "The selected lead source is invalid.", 400);
    }

    const before = {
      sourceCode: existing.sourceCode,
      ownerPartyId: existing.ownerPartyId,
      branchId: existing.branchId,
      email: existing.email,
      phone: existing.phone,
    };

    const updated = await this.leadRepository.updateById(
      context.businessId,
      leadId,
      {
        sourceCode: parsed.data.sourceCode,
        channelCode: parsed.data.channelCode,
        ownerPartyId: parsed.data.ownerPartyId,
        branchId: parsed.data.branchId,
        companyName: parsed.data.companyName,
        contactName: parsed.data.contactName,
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        qualificationScore: parsed.data.qualificationScore,
        notes: parsed.data.notes,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new LeadError(
        "VERSION_CONFLICT",
        "This lead was updated by someone else. Refresh and try again.",
        409
      );
    }

    if (
      parsed.data.ownerPartyId !== undefined &&
      parsed.data.ownerPartyId !== existing.ownerPartyId &&
      parsed.data.ownerPartyId
    ) {
      await this.workAssignmentService.assign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_LEAD,
        subjectId: leadId,
        ownerType: WORK_OWNER_TYPES.PARTY,
        ownerId: parsed.data.ownerPartyId,
        ownerPartyId: parsed.data.ownerPartyId,
        assignmentType: WORK_ASSIGNMENT_TYPES.MANUAL,
        reasonCode: "REASSIGN",
      });
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: existing.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_LEAD,
      entityId: leadId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      before,
      after: {
        sourceCode: updated.sourceCode,
        ownerPartyId: updated.ownerPartyId,
        branchId: updated.branchId,
        email: updated.email,
        phone: updated.phone,
      },
      trackFields: ["sourceCode", "ownerPartyId", "branchId", "email", "phone"],
    });

    return this.getLead(context, leadId);
  }

  async transitionLeadStatus(
    context: CurrentBusinessContext,
    leadId: string,
    payload: LeadStatusTransitionPayload
  ): Promise<LeadDetailView> {
    const parsed = leadStatusTransitionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LeadError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid status transition.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, leadId);

    if (!isLeadEditable(existing.statusCode)) {
      throw new LeadError("LEAD_READ_ONLY", LEAD_USER_MESSAGES.LEAD_READ_ONLY, 409);
    }

    const toStatus = parsed.data.statusCode;
    if (!isLeadStatusCode(toStatus)) {
      throw new LeadError("INVALID_INPUT", "The selected status is invalid.", 400);
    }

    if (!canTransitionLeadStatus(existing.statusCode, toStatus)) {
      throw new LeadError(
        "INVALID_STATUS_TRANSITION",
        LEAD_USER_MESSAGES.INVALID_STATUS_TRANSITION,
        409
      );
    }

    if (toStatus === LEAD_STATUS_CODES.QUALIFIED) {
      const businessSettings =
        await this.businessConfigurationRepository.findSettingsByBusinessId(
          context.businessId
        );
      const qualificationConfig = resolveLeadQualificationConfig(businessSettings);
      const qualificationError = validateQualificationTransition({
        config: qualificationConfig,
        toStatus,
        ownerPartyId: existing.ownerPartyId,
        qualificationScore: existing.qualificationScore,
      });

      if (qualificationError) {
        throw new LeadError("INVALID_INPUT", qualificationError, 400);
      }
    }

    if (
      toStatus === LEAD_STATUS_CODES.UNQUALIFIED &&
      !parsed.data.disqualificationReasonCode
    ) {
      throw new LeadError(
        "DISQUALIFICATION_REASON_REQUIRED",
        LEAD_USER_MESSAGES.DISQUALIFICATION_REASON_REQUIRED,
        400
      );
    }

    if (
      parsed.data.disqualificationReasonCode &&
      !(await this.leadReferenceRepository.isActiveDisqualificationReason(
        parsed.data.disqualificationReasonCode
      ))
    ) {
      throw new LeadError(
        "INVALID_INPUT",
        "The disqualification reason is invalid.",
        400
      );
    }

    const updated = await this.leadRepository.updateById(
      context.businessId,
      leadId,
      {
        statusCode: toStatus,
        disqualificationReasonCode:
          toStatus === LEAD_STATUS_CODES.UNQUALIFIED
            ? parsed.data.disqualificationReasonCode ?? null
            : null,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new LeadError(
        "VERSION_CONFLICT",
        "This lead was updated by someone else. Refresh and try again.",
        409
      );
    }

    if (toStatus === LEAD_STATUS_CODES.QUALIFIED) {
      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: existing.partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.LEAD_QUALIFIED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
          summary: `Lead qualified — ${existing.leadNumber}`,
          referenceEntity: AUDIT_ENTITY_NAMES.CRM_LEAD,
          referenceId: leadId,
        })
      );
    }

    if (toStatus === LEAD_STATUS_CODES.UNQUALIFIED) {
      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: existing.partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.LEAD_DISQUALIFIED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
          summary: `Lead disqualified — ${existing.leadNumber}`,
          referenceEntity: AUDIT_ENTITY_NAMES.CRM_LEAD,
          referenceId: leadId,
          metadata: {
            reasonCode: parsed.data.disqualificationReasonCode,
          },
        })
      );
    }

    return this.getLead(context, leadId);
  }

  async disqualifyLead(
    context: CurrentBusinessContext,
    leadId: string,
    payload: LeadDisqualifyPayload
  ): Promise<LeadDetailView> {
    await this.requireJoinedRow(context, leadId);
    return this.transitionLeadStatus(context, leadId, {
      statusCode: LEAD_STATUS_CODES.UNQUALIFIED,
      version: payload.version,
      disqualificationReasonCode: payload.reasonCode,
    });
  }

  async convertLead(
    context: CurrentBusinessContext,
    leadId: string,
    payload: LeadConvertPayload
  ): Promise<LeadDetailView> {
    const parsed = leadConvertSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LeadError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid conversion input.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, leadId);

    if (existing.statusCode !== LEAD_STATUS_CODES.QUALIFIED) {
      throw new LeadError(
        "CONVERSION_NOT_ALLOWED",
        LEAD_USER_MESSAGES.CONVERSION_NOT_ALLOWED,
        409
      );
    }

    let crmRecord = await this.crmRepository.findByPartyId(
      context.businessId,
      existing.partyId
    );

    const businessSettings =
      await this.businessConfigurationRepository.findSettingsByBusinessId(
        context.businessId
      );
    const conversionConfig = resolveLeadConversionConfig(businessSettings);

    const createCrmIfMissing =
      parsed.data.createCrmIfMissing ?? conversionConfig.createCrmIfMissingDefault;
    const createOpportunity =
      parsed.data.createOpportunity ?? conversionConfig.createOpportunityDefault;

    if (!crmRecord && createCrmIfMissing) {
      const party = await this.crmReferenceRepository.findParty(
        context.businessId,
        existing.partyId
      );

      if (!party) {
        throw new LeadError("PARTY_NOT_FOUND", "The linked party was not found.", 404);
      }

      const crmTypeCode =
        parsed.data.crmTypeCode || inferCrmTypeFromPartyType(party.partyTypeCode);
      const sequence = await this.crmRepository.nextCustomerSequence(
        context.businessId
      );
      const customerNumber = formatCustomerNumber(sequence);

      crmRecord = await this.crmRepository.insert({
        businessId: context.businessId,
        partyId: existing.partyId,
        customerNumber,
        crmTypeCode,
        statusCode: conversionConfig.crmStatusOnConvert,
        ownerPartyId: existing.ownerPartyId,
        branchId: existing.branchId,
        sourceCode: existing.sourceCode,
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      });

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: existing.partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.CRM_RECORD_CREATED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
          summary: `Customer record created from lead — ${customerNumber}`,
          referenceEntity: AUDIT_ENTITY_NAMES.CRM_RECORD,
          referenceId: crmRecord.id,
          metadata: { leadId, leadNumber: existing.leadNumber },
        })
      );
    }

    if (!crmRecord) {
      throw new LeadError(
        "INVALID_INPUT",
        "No CRM record exists for this party. Enable create-on-convert or register the customer first.",
        409
      );
    }

    const updated = await this.leadRepository.updateById(
      context.businessId,
      leadId,
      {
        statusCode: LEAD_STATUS_CODES.CONVERTED,
        convertedCrmId: crmRecord.id,
        convertedAt: new Date(),
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new LeadError(
        "VERSION_CONFLICT",
        "This lead was updated by someone else. Refresh and try again.",
        409
      );
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.LEAD_CONVERTED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary: `Lead converted — ${existing.leadNumber}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_LEAD,
        referenceId: leadId,
        metadata: { crmId: crmRecord.id, customerNumber: crmRecord.customerNumber },
      })
    );

    if (createOpportunity) {
      await this.opportunityService.createFromLeadConversion(context, {
        leadId,
        leadNumber: existing.leadNumber,
        crmRecordId: crmRecord.id,
        partyId: existing.partyId,
        ownerPartyId: existing.ownerPartyId,
        branchId: existing.branchId,
        sourceCode: existing.sourceCode,
        qualificationScore: existing.qualificationScore,
        companyName: existing.companyName,
        contactName: existing.contactName,
        email: existing.email,
        phone: existing.phone,
        opportunityName: parsed.data.opportunityName,
      });
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: existing.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_LEAD,
      entityId: leadId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      before: { statusCode: existing.statusCode },
      after: {
        statusCode: LEAD_STATUS_CODES.CONVERTED,
        convertedCrmId: crmRecord.id,
      },
      trackFields: ["statusCode", "convertedCrmId"],
    });

    return this.getLead(context, leadId);
  }

  async getActiveLeadWidgetSummary(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<ActiveLeadWidgetSummary | null> {
    const row = await this.leadRepository.findActiveByPartyId(
      context.businessId,
      partyId
    );

    if (!row) {
      return null;
    }

    const [statusName, sourceName, ownerDisplayName] = await Promise.all([
      this.leadReferenceRepository.getLeadStatusName(row.statusCode),
      this.leadReferenceRepository.getLeadSourceName(row.sourceCode),
      row.ownerPartyId
        ? this.crmReferenceRepository.findPartyDisplayName(
            context.businessId,
            row.ownerPartyId
          )
        : Promise.resolve(null),
    ]);

    return {
      leadId: row.id,
      leadNumber: row.leadNumber,
      statusCode: row.statusCode,
      statusName,
      sourceName,
      ownerDisplayName,
      statusTone: resolveLeadStatusTone(row.statusCode),
    };
  }

  private async requireJoinedRow(
    context: CurrentBusinessContext,
    leadId: string
  ): Promise<LeadJoinedRow> {
    const row = await this.leadRepository.findByIdJoined(context.businessId, leadId);
    if (!row) {
      throw new LeadError("LEAD_NOT_FOUND", "The lead was not found.", 404);
    }
    return row;
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: LeadJoinedRow
  ): Promise<LeadSummaryView> {
    const [statusName, sourceName, ownerDisplayName, branchName] =
      await Promise.all([
        this.leadReferenceRepository.getLeadStatusName(row.statusCode),
        this.leadReferenceRepository.getLeadSourceName(row.sourceCode),
        row.ownerPartyId
          ? this.crmReferenceRepository.findPartyDisplayName(
              context.businessId,
              row.ownerPartyId
            )
          : Promise.resolve(null),
        row.branchId
          ? this.crmReferenceRepository.getBranchName(context.businessId, row.branchId)
          : Promise.resolve(null),
      ]);

    return {
      leadId: row.id,
      partyId: row.partyId,
      leadNumber: row.leadNumber,
      displayName: row.partyDisplayName,
      partyNumber: row.partyNumber,
      statusCode: row.statusCode,
      statusName,
      sourceCode: row.sourceCode,
      sourceName,
      ownerPartyId: row.ownerPartyId,
      ownerDisplayName,
      branchId: row.branchId,
      branchName,
      email: row.email,
      phone: row.phone,
      qualificationScore: row.qualificationScore,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: LeadJoinedRow
  ): Promise<LeadDetailView> {
    const summary = await this.toSummaryView(context, row);
    const [channelName, disqualificationReasonName, duplicateCandidates] =
      await Promise.all([
        row.channelCode
          ? Promise.resolve(
              row.channelCode
                .split("_")
                .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                .join(" ")
            )
          : Promise.resolve(null),
        row.disqualificationReasonCode
          ? this.leadReferenceRepository.getDisqualificationReasonName(
              row.disqualificationReasonCode
            )
          : Promise.resolve(null),
        this.leadRepository.findDuplicateCandidates(context.businessId, {
          email: row.email,
          phone: row.phone,
          companyName: row.companyName,
        }, row.id),
      ]);

    const assignmentSummary = await this.workAssignmentService.getSummary(
      context,
      WORK_SUBJECT_TYPES.CRM_LEAD,
      row.id
    );

    const duplicateWarnings = duplicateCandidates.map((candidate) => {
      const parts = [];
      if (candidate.email) parts.push(`email ${candidate.email}`);
      if (candidate.phone) parts.push(`phone ${candidate.phone}`);
      if (candidate.companyName) parts.push(`company ${candidate.companyName}`);
      return `Possible duplicate of ${candidate.leadNumber} (${parts.join(", ")})`;
    });

    return {
      ...summary,
      channelCode: row.channelCode,
      channelName,
      companyName: row.companyName,
      contactName: row.contactName,
      convertedCrmId: row.convertedCrmId,
      convertedAt: row.convertedAt?.toISOString() ?? null,
      disqualificationReasonCode: row.disqualificationReasonCode,
      disqualificationReasonName,
      notes: row.notes,
      version: row.version,
      assignmentSummary,
      duplicateWarnings,
    };
  }
}

export function createLeadService(): LeadService {
  return new LeadService();
}
