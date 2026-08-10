/**
 * Purpose:
 * CRM Foundation orchestration — create, update, lifecycle, search, Customer 360.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import { resolveEntityTerminology } from "@/core/industry-experience/entity-terminology";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
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
import {
  createCommunicationPreferenceRepository,
  PREFERRED_CONTACT_METHOD_LABELS,
  type PreferredContactMethod,
} from "@/core/communication-preference";
import {
  composeCustomer360View,
} from "@/modules/crm/customer-360/customer-360-composer";
import "@/modules/crm/customer-360/bootstrap-widgets";
import {
  CRM_DEFAULT_PAGE_SIZE,
  CRM_RECORD_SOURCE_CODES,
  CRM_SOURCE_CODES,
  CRM_STATUS_CODES,
  type CrmStatusCode,
} from "@/modules/crm/constants";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import {
  createCrmRecordRepository,
  type CrmRecordJoinedRow,
} from "@/modules/crm/repositories/crm-record-repository";
import { createCrmReferenceRepository } from "@/modules/crm/repositories/crm-reference-repository";
import { recordCrmEntityAudit } from "@/modules/crm/services/crm-audit-helper";
import {
  canTransitionCrmStatus,
  formatCustomerNumber,
  inferCrmTypeFromPartyType,
  isCrmRecordEditable,
  isCrmRecordSourceCode,
  isCrmStatusCode,
  resolveDefaultCrmStatus,
} from "@/modules/crm/services/crm-rules";
import type {
  CreateCrmRecordPayload,
  CrmDashboardView,
  CrmDetailView,
  CrmListFilters,
  CrmListView,
  CrmRegistrationCatalogues,
  CrmStatusTransitionPayload,
  CrmSummaryView,
  Customer360CompositionView,
  UpdateCrmRecordPayload,
} from "@/modules/crm/types";
import {
  createCrmRecordSchema,
  crmListFiltersSchema,
  crmSearchQuerySchema,
  crmStatusTransitionSchema,
  updateCrmRecordSchema,
} from "@/modules/crm/validators/crm-validators";
import { createPartyRelationshipService } from "@/modules/party/services/party-relationship-service";
import { createBusinessConfigurationRepository } from "@/modules/business/onboarding/repositories/business-configuration-repository";

export class CrmService {
  constructor(
    private readonly crmRepository = createCrmRecordRepository(),
    private readonly referenceRepository = createCrmReferenceRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly workAssignmentService = createWorkAssignmentService(),
    private readonly industryExperienceService = createIndustryExperienceService(),
    private readonly partyRelationshipService = createPartyRelationshipService(),
    private readonly businessConfigurationRepository = createBusinessConfigurationRepository(),
    private readonly communicationPreferenceRepository = createCommunicationPreferenceRepository()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<CrmRegistrationCatalogues> {
    const [crmTypes, crmStatuses, branches, ownerParties] = await Promise.all([
      this.referenceRepository.listActiveCrmTypes(),
      this.referenceRepository.listActiveCrmStatuses(),
      this.referenceRepository.listBranchOptions(context.businessId),
      this.referenceRepository.listOwnerPartyOptions(context.businessId),
    ]);

    if (crmTypes.length === 0 || crmStatuses.length === 0) {
      throw new CrmError(
        "REFERENCE_DATA_MISSING",
        CRM_USER_MESSAGES.REFERENCE_DATA_MISSING,
        503
      );
    }

    return {
      crmTypes,
      crmStatuses,
      branches,
      ownerParties,
      sourceCodes: Object.entries(CRM_SOURCE_CODES).map(([code, value]) => ({
        code: value,
        name: code
          .split("_")
          .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
          .join(" "),
      })),
      recordSources: [
        {
          code: CRM_RECORD_SOURCE_CODES.PLATFORM_CREATED,
          name: "Platform Created",
        },
        { code: CRM_RECORD_SOURCE_CODES.MIGRATED, name: "Migrated" },
        { code: CRM_RECORD_SOURCE_CODES.API, name: "API" },
      ],
    };
  }

  async getDashboard(context: CurrentBusinessContext): Promise<CrmDashboardView> {
    const industryContext =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );
    const terminology = resolveEntityTerminology(industryContext.industryCode);

    const [
      totalCustomers,
      prospectCount,
      leadCount,
      activeCount,
      dormantCount,
      recentRows,
      statusGroups,
      typeGroups,
      statuses,
      types,
    ] = await Promise.all([
      this.crmRepository.countByBusinessId(context.businessId),
      this.crmRepository.countByStatus(
        context.businessId,
        CRM_STATUS_CODES.PROSPECT
      ),
      this.crmRepository.countByStatus(context.businessId, CRM_STATUS_CODES.LEAD),
      this.crmRepository.countByStatus(
        context.businessId,
        CRM_STATUS_CODES.ACTIVE
      ),
      this.crmRepository.countByStatus(
        context.businessId,
        CRM_STATUS_CODES.DORMANT
      ),
      this.crmRepository.listRecentlyUpdatedByBusinessId(context.businessId, 8),
      this.crmRepository.countGroupedByStatus(context.businessId),
      this.crmRepository.countGroupedByType(context.businessId),
      this.referenceRepository.listActiveCrmStatuses(),
      this.referenceRepository.listActiveCrmTypes(),
    ]);

    const statusNameByCode = new Map(statuses.map((s) => [s.code, s.name]));
    const typeNameByCode = new Map(types.map((t) => [t.code, t.name]));

    const recentlyUpdated = await Promise.all(
      recentRows.map((row) => this.toSummaryView(context, row))
    );

    return {
      totalCustomers,
      prospectCount,
      leadCount,
      activeCount,
      dormantCount,
      recentlyUpdated,
      customerLabel: terminology.customer.singular,
      customersLabel: terminology.customer.plural,
      statusSummary: statusGroups.map((group) => ({
        statusCode: group.statusCode,
        statusName: statusNameByCode.get(group.statusCode) ?? group.statusCode,
        count: Number(group.total),
      })),
      typeSummary: typeGroups.map((group) => ({
        typeCode: group.crmTypeCode,
        typeName: typeNameByCode.get(group.crmTypeCode) ?? group.crmTypeCode,
        count: Number(group.total),
      })),
    };
  }

  async createCrmRecord(
    context: CurrentBusinessContext,
    payload: CreateCrmRecordPayload
  ): Promise<CrmDetailView> {
    const parsed = createCrmRecordSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid customer input.",
        400
      );
    }

    const input = parsed.data;
    const party = await this.referenceRepository.findParty(
      context.businessId,
      input.partyId
    );

    if (!party) {
      throw new CrmError("PARTY_NOT_FOUND", "The selected party was not found.", 404);
    }

    const existing = await this.crmRepository.findByPartyId(
      context.businessId,
      input.partyId
    );

    if (existing) {
      throw new CrmError(
        "DUPLICATE_CRM_PARTY",
        CRM_USER_MESSAGES.DUPLICATE_CRM_PARTY,
        409
      );
    }

    const crmTypeCode =
      input.crmTypeCode || inferCrmTypeFromPartyType(party.partyTypeCode);

    if (!(await this.referenceRepository.isActiveCrmType(crmTypeCode))) {
      throw new CrmError("INVALID_CRM_TYPE", "The selected customer type is invalid.", 400);
    }

    const statusCode = (input.statusCode ??
      resolveDefaultCrmStatus()) as CrmStatusCode;

    if (!isCrmStatusCode(statusCode)) {
      throw new CrmError("INVALID_INPUT", "The selected status is invalid.", 400);
    }

    if (input.recordSource && !isCrmRecordSourceCode(input.recordSource)) {
      throw new CrmError("INVALID_INPUT", "The record source is invalid.", 400);
    }

    const sequence = await this.crmRepository.nextCustomerSequence(
      context.businessId
    );
    const customerNumber = formatCustomerNumber(sequence);

    const row = await this.crmRepository.insert({
      businessId: context.businessId,
      partyId: input.partyId,
      customerNumber,
      crmTypeCode,
      statusCode,
      ownerPartyId: input.ownerPartyId ?? null,
      relationshipManagerPartyId: input.relationshipManagerPartyId ?? null,
      branchId: input.branchId ?? null,
      sourceCode: input.sourceCode ?? null,
      recordSource: input.recordSource ?? CRM_RECORD_SOURCE_CODES.PLATFORM_CREATED,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    if (row.ownerPartyId) {
      await this.workAssignmentService.assign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_RECORD,
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
        eventType: PARTY_TIMELINE_EVENT_TYPES.CRM_RECORD_CREATED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary: `Customer record created — ${customerNumber}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_RECORD,
        referenceId: row.id,
        metadata: { customerNumber, statusCode, crmTypeCode },
      })
    );

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: row.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_RECORD,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      createValues: {
        customerNumber,
        crmTypeCode,
        statusCode,
        partyId: row.partyId,
      },
    });

    return this.getCrmRecord(context, row.id);
  }

  async getCrmRecord(
    context: CurrentBusinessContext,
    crmId: string
  ): Promise<CrmDetailView> {
    const row = await this.requireJoinedRow(context, crmId);
    return this.toDetailView(context, row);
  }

  async updateCrmRecord(
    context: CurrentBusinessContext,
    crmId: string,
    payload: UpdateCrmRecordPayload
  ): Promise<CrmDetailView> {
    const parsed = updateCrmRecordSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid customer input.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, crmId);

    if (!isCrmRecordEditable(existing.statusCode as CrmStatusCode)) {
      throw new CrmError(
        "CRM_RECORD_READ_ONLY",
        CRM_USER_MESSAGES.CRM_RECORD_READ_ONLY,
        409
      );
    }

    if (
      parsed.data.crmTypeCode &&
      !(await this.referenceRepository.isActiveCrmType(parsed.data.crmTypeCode))
    ) {
      throw new CrmError("INVALID_CRM_TYPE", "The selected customer type is invalid.", 400);
    }

    const before = {
      crmTypeCode: existing.crmTypeCode,
      ownerPartyId: existing.ownerPartyId,
      relationshipManagerPartyId: existing.relationshipManagerPartyId,
      branchId: existing.branchId,
      sourceCode: existing.sourceCode,
    };

    const updated = await this.crmRepository.updateById(
      context.businessId,
      crmId,
      {
        crmTypeCode: parsed.data.crmTypeCode,
        ownerPartyId: parsed.data.ownerPartyId,
        relationshipManagerPartyId: parsed.data.relationshipManagerPartyId,
        branchId: parsed.data.branchId,
        sourceCode: parsed.data.sourceCode,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new CrmError(
        "VERSION_CONFLICT",
        "This customer record was updated elsewhere. Refresh and try again.",
        409
      );
    }

    if (
      parsed.data.ownerPartyId !== undefined &&
      parsed.data.ownerPartyId !== existing.ownerPartyId &&
      parsed.data.ownerPartyId
    ) {
      await this.workAssignmentService.reassign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_RECORD,
        subjectId: crmId,
        ownerType: WORK_OWNER_TYPES.PARTY,
        ownerId: parsed.data.ownerPartyId,
        ownerPartyId: parsed.data.ownerPartyId,
        assignmentType: WORK_ASSIGNMENT_TYPES.MANUAL,
        reasonCode: "OWNER_CHANGED",
      });

      await this.timelineService.recordEvent(
        buildTimelineEventFromContext(context, {
          partyId: existing.partyId,
          eventType: PARTY_TIMELINE_EVENT_TYPES.CRM_OWNER_ASSIGNED,
          eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
          sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
          summary: "Customer owner assigned",
          referenceEntity: AUDIT_ENTITY_NAMES.CRM_RECORD,
          referenceId: crmId,
        })
      );
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: existing.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_RECORD,
      entityId: crmId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      before,
      after: {
        crmTypeCode: updated.crmTypeCode,
        ownerPartyId: updated.ownerPartyId,
        relationshipManagerPartyId: updated.relationshipManagerPartyId,
        branchId: updated.branchId,
        sourceCode: updated.sourceCode,
      },
      trackFields: [
        "crmTypeCode",
        "ownerPartyId",
        "relationshipManagerPartyId",
        "branchId",
        "sourceCode",
      ],
    });

    return this.getCrmRecord(context, crmId);
  }

  async transitionCrmStatus(
    context: CurrentBusinessContext,
    crmId: string,
    payload: CrmStatusTransitionPayload
  ): Promise<CrmDetailView> {
    const parsed = crmStatusTransitionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new CrmError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid status transition.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, crmId);
    const currentStatus = existing.statusCode as CrmStatusCode;
    const nextStatus = parsed.data.statusCode as CrmStatusCode;

    if (!isCrmStatusCode(nextStatus)) {
      throw new CrmError("INVALID_INPUT", "The selected status is invalid.", 400);
    }

    if (!canTransitionCrmStatus(currentStatus, nextStatus)) {
      throw new CrmError(
        "INVALID_STATUS_TRANSITION",
        CRM_USER_MESSAGES.INVALID_STATUS_TRANSITION,
        409
      );
    }

    const updated = await this.crmRepository.updateById(
      context.businessId,
      crmId,
      {
        statusCode: nextStatus,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new CrmError(
        "VERSION_CONFLICT",
        "This customer record was updated elsewhere. Refresh and try again.",
        409
      );
    }

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.CRM_STATUS_CHANGED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary: `Customer status changed to ${await this.referenceRepository.getCrmStatusName(nextStatus)}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_RECORD,
        referenceId: crmId,
        metadata: { fromStatus: currentStatus, toStatus: nextStatus },
      })
    );

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: existing.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_RECORD,
      entityId: crmId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      before: { statusCode: currentStatus },
      after: { statusCode: nextStatus },
      trackFields: ["statusCode"],
    });

    return this.getCrmRecord(context, crmId);
  }

  async listCrmRecords(
    context: CurrentBusinessContext,
    filters: CrmListFilters = {}
  ): Promise<CrmListView> {
    const parsed = crmListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new CrmError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid list filters.",
        400
      );
    }

    const result = await this.crmRepository.listJoined(context.businessId, {
      search: parsed.data.search,
      statusCode: parsed.data.statusCode,
      crmTypeCode: parsed.data.crmTypeCode,
      ownerPartyId: parsed.data.ownerPartyId,
      branchId: parsed.data.branchId,
      limit: parsed.data.limit ?? CRM_DEFAULT_PAGE_SIZE,
      offset: parsed.data.offset ?? 0,
    });

    const items = await Promise.all(
      result.rows.map((row) => this.toSummaryView(context, row))
    );

    return {
      items,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    };
  }

  async searchCrmRecords(
    context: CurrentBusinessContext,
    query: string
  ): Promise<CrmSummaryView[]> {
    const parsed = crmSearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new CrmError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid search query.",
        400
      );
    }

    const rows = await this.crmRepository.searchByQuery(
      context.businessId,
      parsed.data
    );

    return Promise.all(rows.map((row) => this.toSummaryView(context, row)));
  }

  async getCustomer360Panel(
    context: CurrentBusinessContext,
    crmId: string
  ): Promise<Customer360CompositionView> {
    const customer = await this.getCrmRecord(context, crmId);
    const [relationships, partyTimeline, businessSettings, preferenceRow] =
      await Promise.all([
        this.partyRelationshipService.getPartyRelationships(
          context,
          customer.partyId
        ),
        this.timelineService.listEvents(context.businessId, customer.partyId, {
          limit: 12,
        }),
        this.businessConfigurationRepository.findSettingsByBusinessId(
          context.businessId
        ),
        this.communicationPreferenceRepository.findActiveByPartyId(
          context.businessId,
          customer.partyId
        ),
      ]);

    const preferredMethod = preferenceRow?.preferredContactMethod ?? null;
    const preferredChannel =
      preferredMethod &&
      preferredMethod in PREFERRED_CONTACT_METHOD_LABELS
        ? PREFERRED_CONTACT_METHOD_LABELS[
            preferredMethod as PreferredContactMethod
          ]
        : preferredMethod;

    return composeCustomer360View({
      context,
      customer,
      relationships,
      partyTimeline,
      assignmentSummary: customer.assignmentSummary,
      preferredChannel,
      businessSettings: businessSettings ?? undefined,
    });
  }

  private async requireJoinedRow(context: CurrentBusinessContext, crmId: string) {
    const row = await this.crmRepository.findByIdJoined(context.businessId, crmId);
    if (!row) {
      throw new CrmError(
        "CRM_RECORD_NOT_FOUND",
        "The customer record was not found.",
        404
      );
    }
    return row;
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: CrmRecordJoinedRow
  ): Promise<CrmSummaryView> {
    const [crmTypeName, statusName, ownerDisplayName, branchName] =
      await Promise.all([
        this.referenceRepository.getCrmTypeName(row.crmTypeCode),
        this.referenceRepository.getCrmStatusName(row.statusCode),
        row.ownerPartyId
          ? this.referenceRepository.findPartyDisplayName(
              context.businessId,
              row.ownerPartyId
            )
          : Promise.resolve(null),
        row.branchId
          ? this.referenceRepository.getBranchName(context.businessId, row.branchId)
          : Promise.resolve(null),
      ]);

    return {
      crmId: row.id,
      partyId: row.partyId,
      customerNumber: row.customerNumber,
      displayName: row.partyDisplayName,
      partyTypeCode: row.partyTypeCode,
      crmTypeCode: row.crmTypeCode,
      crmTypeName,
      statusCode: row.statusCode,
      statusName,
      ownerPartyId: row.ownerPartyId,
      ownerDisplayName,
      branchId: row.branchId,
      branchName,
      customerSince: row.customerSince.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: CrmRecordJoinedRow
  ): Promise<CrmDetailView> {
    const summary = await this.toSummaryView(context, row);
    const [relationshipManagerDisplayName, sourceName, assignmentSummary] =
      await Promise.all([
        row.relationshipManagerPartyId
          ? this.referenceRepository.findPartyDisplayName(
              context.businessId,
              row.relationshipManagerPartyId
            )
          : Promise.resolve(null),
        row.sourceCode
          ? Promise.resolve(
              row.sourceCode
                .split("_")
                .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                .join(" ")
            )
          : Promise.resolve(null),
        this.workAssignmentService.getSummary(
          context,
          WORK_SUBJECT_TYPES.CRM_RECORD,
          row.id,
          summary.ownerDisplayName
        ),
      ]);

    return {
      ...summary,
      relationshipManagerPartyId: row.relationshipManagerPartyId,
      relationshipManagerDisplayName,
      sourceCode: row.sourceCode,
      sourceName,
      recordSource: row.recordSource,
      notes: null,
      version: row.version,
      assignmentSummary,
    };
  }
}

export function createCrmService() {
  return new CrmService();
}
