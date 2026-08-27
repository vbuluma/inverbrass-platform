/**
 * Purpose:
 * Opportunity Management orchestration — pipeline, stages, forecast, conversion.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
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
  DEFAULT_OPEN_STAGE_CODE,
  DEFAULT_PIPELINE_CODE,
  OPPORTUNITY_DEFAULT_PAGE_SIZE,
  OPPORTUNITY_STATUS_CODES,
  buildLeadConversionMetadata,
} from "@/modules/crm/opportunity/constants";
import {
  OpportunityError,
  OPPORTUNITY_USER_MESSAGES,
} from "@/modules/crm/opportunity/errors";
import { createOpportunityReferenceRepository } from "@/modules/crm/opportunity/repositories/opportunity-reference-repository";
import {
  createOpportunityRepository,
  type OpportunityJoinedRow,
} from "@/modules/crm/opportunity/repositories/opportunity-repository";
import {
  calculateWeightedAmount,
  canTransitionStage,
  formatOpportunityNumber,
  isOpportunityEditable,
  resolveStatusForStage,
} from "@/modules/crm/opportunity/services/opportunity-rules";
import type {
  CreateOpportunityPayload,
  LeadConversionOpportunityInput,
  OpenOpportunitiesWidgetSummary,
  OpportunityDashboardView,
  OpportunityDetailView,
  OpportunityLineItemPayload,
  OpportunityListFilters,
  OpportunityListView,
  OpportunityRegistrationCatalogues,
  OpportunityStageTransitionPayload,
  OpportunitySummaryView,
  UpdateOpportunityPayload,
} from "@/modules/crm/opportunity/types";
import {
  createOpportunitySchema,
  opportunityLineItemSchema,
  opportunityListFiltersSchema,
  opportunitySearchQuerySchema,
  opportunityStageTransitionSchema,
  updateOpportunitySchema,
} from "@/modules/crm/opportunity/validators/opportunity-validators";
import { createAccountRepository } from "@/modules/crm/account/repositories/account-repository";
import { resolveLeadConversionConfig } from "@/modules/crm/lead/services/lead-conversion-config";
import {
  canTransitionCrmStatus,
  isCrmStatusCode,
} from "@/modules/crm/services/crm-rules";
import { CRM_STATUS_CODES, type CrmStatusCode } from "@/modules/crm/constants";
import { createBusinessConfigurationRepository } from "@/modules/business/onboarding/repositories/business-configuration-repository";
import { getDb } from "@/db/client";
import { product } from "@/db/schema/product";
import { and, eq, isNull } from "drizzle-orm";

export class OpportunityService {
  constructor(
    private readonly opportunityRepository = createOpportunityRepository(),
    private readonly referenceRepository = createOpportunityReferenceRepository(),
    private readonly crmReferenceRepository = createCrmReferenceRepository(),
    private readonly crmRepository = createCrmRecordRepository(),
    private readonly accountRepository = createAccountRepository(),
    private readonly businessConfigurationRepository = createBusinessConfigurationRepository(),
    private readonly timelineService = createPartyTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly workAssignmentService = createWorkAssignmentService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<OpportunityRegistrationCatalogues> {
    const [pipelines, stages, lossReasons, branches, ownerParties] =
      await Promise.all([
        this.referenceRepository.listActivePipelines(),
        this.referenceRepository.listActiveStages(),
        this.referenceRepository.listActiveLossReasons(),
        this.crmReferenceRepository.listBranchOptions(context.businessId),
        this.crmReferenceRepository.listOwnerPartyOptions(context.businessId),
      ]);

    if (pipelines.length === 0 || stages.length === 0) {
      throw new OpportunityError(
        "REFERENCE_DATA_MISSING",
        OPPORTUNITY_USER_MESSAGES.REFERENCE_DATA_MISSING,
        503
      );
    }

    const pipelineCodeById = new Map(pipelines.map((p) => [p.id, p.code]));

    return {
      pipelines,
      stages: stages.map((stage) => ({
        code: stage.code,
        name: stage.name,
        description: stage.description,
        pipelineCode: pipelineCodeById.get(stage.pipelineId) ?? "",
        defaultProbability: stage.defaultProbability,
        isClosedWon: stage.isClosedWon,
        isClosedLost: stage.isClosedLost,
      })),
      lossReasons,
      branches,
      ownerParties,
    };
  }

  async getDashboard(context: CurrentBusinessContext): Promise<OpportunityDashboardView> {
    const [
      totalOpen,
      totalWon,
      totalLost,
      totals,
      recentRows,
      stageGroups,
      stages,
    ] = await Promise.all([
      this.opportunityRepository.countByStatus(
        context.businessId,
        OPPORTUNITY_STATUS_CODES.OPEN
      ),
      this.opportunityRepository.countByStatus(
        context.businessId,
        OPPORTUNITY_STATUS_CODES.WON
      ),
      this.opportunityRepository.countByStatus(
        context.businessId,
        OPPORTUNITY_STATUS_CODES.LOST
      ),
      this.opportunityRepository.sumOpenPipelineValue(context.businessId),
      this.opportunityRepository.listRecentlyUpdated(context.businessId, 8),
      this.opportunityRepository.countGroupedByStage(context.businessId),
      this.referenceRepository.listActiveStages(),
    ]);

    const stageNameByCode = new Map(stages.map((s) => [s.code, s.name]));
    const recentlyUpdated = await Promise.all(
      recentRows.map((row) => this.toSummaryView(context, row))
    );

    return {
      totalOpen,
      totalWon,
      totalLost,
      pipelineValue: totals.pipelineValue,
      weightedForecast: totals.weightedForecast,
      recentlyUpdated,
      stageSummary: stageGroups.map((group) => ({
        stageCode: group.stageCode,
        stageName: stageNameByCode.get(group.stageCode) ?? group.stageCode,
        count: Number(group.total),
      })),
    };
  }

  async createOpportunity(
    context: CurrentBusinessContext,
    payload: CreateOpportunityPayload
  ): Promise<OpportunityDetailView> {
    const parsed = createOpportunitySchema.safeParse(payload);
    if (!parsed.success) {
      throw new OpportunityError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid opportunity input.",
        400
      );
    }

    const crmRecord = await this.crmRepository.findByIdJoined(
      context.businessId,
      parsed.data.crmRecordId
    );

    if (!crmRecord) {
      throw new OpportunityError(
        "CRM_RECORD_NOT_FOUND",
        "The selected customer record was not found.",
        404
      );
    }

    const accountId = await this.resolveOptionalAccountId(
      context.businessId,
      parsed.data.accountId
    );

    const pipeline = await this.referenceRepository.findPipelineByCode(
      parsed.data.pipelineCode ?? DEFAULT_PIPELINE_CODE
    );

    if (!pipeline) {
      throw new OpportunityError("INVALID_INPUT", "The selected pipeline is invalid.", 400);
    }

    const stageCode = parsed.data.stageCode ?? DEFAULT_OPEN_STAGE_CODE;
    const stage = await this.referenceRepository.getStageByPipelineAndCode(
      pipeline.id,
      stageCode
    );

    if (!stage) {
      throw new OpportunityError("INVALID_INPUT", "The selected stage is invalid.", 400);
    }

    const probability = parsed.data.probability ?? stage.defaultProbability;
    const weightedAmount = calculateWeightedAmount(parsed.data.amount ?? null, probability);
    const sequence = await this.opportunityRepository.nextOpportunitySequence(
      context.businessId
    );

    const row = await this.opportunityRepository.insert({
      businessId: context.businessId,
      crmRecordId: crmRecord.id,
      partyId: crmRecord.partyId,
      accountId,
      sourceLeadId: parsed.data.sourceLeadId ?? null,
      primaryContactPartyId: parsed.data.primaryContactPartyId ?? null,
      opportunityNumber: formatOpportunityNumber(sequence),
      name: parsed.data.name,
      pipelineId: pipeline.id,
      stageCode: stage.code,
      statusCode: resolveStatusForStage(stage),
      ownerPartyId: parsed.data.ownerPartyId ?? crmRecord.ownerPartyId,
      branchId: parsed.data.branchId ?? crmRecord.branchId,
      expectedCloseDate: parsed.data.expectedCloseDate ?? null,
      amount: parsed.data.amount ?? null,
      currencyCode: parsed.data.currencyCode ?? null,
      probability,
      weightedAmount,
      metadata: parsed.data.metadata ?? null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    if (row.ownerPartyId) {
      await this.workAssignmentService.assign(context, {
        subjectType: WORK_SUBJECT_TYPES.CRM_OPPORTUNITY,
        subjectId: row.id,
        ownerType: WORK_OWNER_TYPES.PARTY,
        ownerId: row.ownerPartyId,
        ownerPartyId: row.ownerPartyId,
        assignmentType: WORK_ASSIGNMENT_TYPES.MANUAL,
        reasonCode: "INITIAL_OWNER",
      });
    }

    await this.recordOpportunityCreatedTimeline(context, row);

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: row.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_OPPORTUNITY,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      createValues: {
        opportunityNumber: row.opportunityNumber,
        name: row.name,
        stageCode: row.stageCode,
      },
    });

    return this.getOpportunity(context, row.id);
  }

  async createFromLeadConversion(
    context: CurrentBusinessContext,
    input: LeadConversionOpportunityInput
  ): Promise<OpportunityDetailView> {
    return this.createOpportunity(context, {
      crmRecordId: input.crmRecordId,
      name: input.opportunityName ?? `Opportunity from ${input.leadNumber}`,
      ownerPartyId: input.ownerPartyId,
      branchId: input.branchId,
      sourceLeadId: input.leadId,
      accountId: input.accountId ?? null,
      metadata: buildLeadConversionMetadata({
        sourceCode: input.sourceCode,
        qualificationScore: input.qualificationScore,
        companyName: input.companyName,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
      }),
    });
  }

  async updateOpportunity(
    context: CurrentBusinessContext,
    opportunityId: string,
    payload: UpdateOpportunityPayload
  ): Promise<OpportunityDetailView> {
    const parsed = updateOpportunitySchema.safeParse(payload);
    if (!parsed.success) {
      throw new OpportunityError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid opportunity update.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, opportunityId);

    if (!isOpportunityEditable(existing.statusCode)) {
      throw new OpportunityError(
        "OPPORTUNITY_READ_ONLY",
        OPPORTUNITY_USER_MESSAGES.OPPORTUNITY_READ_ONLY,
        409
      );
    }

    const accountId =
      parsed.data.accountId !== undefined
        ? await this.resolveOptionalAccountId(
            context.businessId,
            parsed.data.accountId
          )
        : undefined;

    const probability =
      parsed.data.probability !== undefined
        ? parsed.data.probability
        : existing.probability;
    const amount =
      parsed.data.amount !== undefined ? parsed.data.amount : existing.amount;
    const weightedAmount = calculateWeightedAmount(
      amount ?? null,
      probability ?? existing.probability
    );

    const updated = await this.opportunityRepository.updateById(
      context.businessId,
      opportunityId,
      {
        name: parsed.data.name,
        accountId,
        ownerPartyId: parsed.data.ownerPartyId,
        branchId: parsed.data.branchId,
        primaryContactPartyId: parsed.data.primaryContactPartyId,
        expectedCloseDate: parsed.data.expectedCloseDate,
        amount: parsed.data.amount,
        currencyCode: parsed.data.currencyCode,
        probability: parsed.data.probability ?? undefined,
        weightedAmount,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new OpportunityError(
        "VERSION_CONFLICT",
        "This opportunity was updated by someone else. Refresh and try again.",
        409
      );
    }

    await recordCrmEntityAudit(this.auditService, context, {
      partyId: existing.partyId,
      entityName: AUDIT_ENTITY_NAMES.CRM_OPPORTUNITY,
      entityId: opportunityId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.CRM_MANAGEMENT,
      before: {
        name: existing.name,
        accountId: existing.accountId,
        ownerPartyId: existing.ownerPartyId,
      },
      after: {
        name: updated.name,
        accountId: updated.accountId,
        ownerPartyId: updated.ownerPartyId,
      },
      trackFields: ["name", "accountId", "ownerPartyId"],
    });

    return this.getOpportunity(context, opportunityId);
  }

  async getOpportunity(
    context: CurrentBusinessContext,
    opportunityId: string
  ): Promise<OpportunityDetailView> {
    const row = await this.requireJoinedRow(context, opportunityId);
    return this.toDetailView(context, row);
  }

  async listOpportunities(
    context: CurrentBusinessContext,
    filters: OpportunityListFilters
  ): Promise<OpportunityListView> {
    const parsed = opportunityListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new OpportunityError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid list filters.",
        400
      );
    }

    let pipelineId: string | undefined;
    if (parsed.data.pipelineCode) {
      const pipeline = await this.referenceRepository.findPipelineByCode(
        parsed.data.pipelineCode
      );
      pipelineId = pipeline?.id;
    }

    const limit = parsed.data.limit ?? OPPORTUNITY_DEFAULT_PAGE_SIZE;
    const offset = parsed.data.offset ?? 0;
    const { items, total } = await this.opportunityRepository.listByFilters(
      context.businessId,
      { ...parsed.data, pipelineId, limit, offset }
    );

    return {
      items: await Promise.all(items.map((row) => this.toSummaryView(context, row))),
      total,
      limit,
      offset,
    };
  }

  async searchOpportunities(
    context: CurrentBusinessContext,
    query: string
  ): Promise<OpportunitySummaryView[]> {
    const parsed = opportunitySearchQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new OpportunityError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid search query.",
        400
      );
    }

    const { items } = await this.opportunityRepository.listByFilters(context.businessId, {
      search: parsed.data,
      limit: 25,
    });

    return Promise.all(items.map((row) => this.toSummaryView(context, row)));
  }

  async transitionStage(
    context: CurrentBusinessContext,
    opportunityId: string,
    payload: OpportunityStageTransitionPayload
  ): Promise<OpportunityDetailView> {
    const parsed = opportunityStageTransitionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new OpportunityError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid stage transition.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, opportunityId);

    if (!isOpportunityEditable(existing.statusCode)) {
      throw new OpportunityError(
        "OPPORTUNITY_READ_ONLY",
        OPPORTUNITY_USER_MESSAGES.OPPORTUNITY_READ_ONLY,
        409
      );
    }

    const stages = await this.referenceRepository.listActiveStages(existing.pipelineId);
    const stageDefs = stages.map((stage) => ({
      code: stage.code,
      displayOrder: stage.displayOrder,
      defaultProbability: stage.defaultProbability,
      isClosedWon: stage.isClosedWon,
      isClosedLost: stage.isClosedLost,
    }));

    if (!canTransitionStage(stageDefs, existing.stageCode, parsed.data.stageCode)) {
      throw new OpportunityError(
        "INVALID_STAGE_TRANSITION",
        OPPORTUNITY_USER_MESSAGES.INVALID_STAGE_TRANSITION,
        409
      );
    }

    const targetStage = stages.find((stage) => stage.code === parsed.data.stageCode);
    if (!targetStage) {
      throw new OpportunityError("INVALID_INPUT", "The selected stage is invalid.", 400);
    }

    if (targetStage.isClosedLost && !parsed.data.lossReasonCode) {
      throw new OpportunityError(
        "LOSS_REASON_REQUIRED",
        OPPORTUNITY_USER_MESSAGES.LOSS_REASON_REQUIRED,
        400
      );
    }

    if (
      parsed.data.lossReasonCode &&
      !(await this.referenceRepository.isActiveLossReason(parsed.data.lossReasonCode))
    ) {
      throw new OpportunityError("INVALID_INPUT", "The loss reason is invalid.", 400);
    }

    if (targetStage.isClosedWon && !parsed.data.finalAmount && !existing.amount) {
      throw new OpportunityError(
        "CLOSE_FIELDS_REQUIRED",
        OPPORTUNITY_USER_MESSAGES.CLOSE_FIELDS_REQUIRED,
        400
      );
    }

    const probability = targetStage.defaultProbability;
    const finalAmount = parsed.data.finalAmount ?? existing.amount ?? null;
    const weightedAmount = calculateWeightedAmount(finalAmount, probability);
    const statusCode = resolveStatusForStage(targetStage);

    const updated = await this.opportunityRepository.updateById(
      context.businessId,
      opportunityId,
      {
        stageCode: targetStage.code,
        statusCode,
        probability,
        amount: finalAmount,
        weightedAmount,
        lossReasonCode: targetStage.isClosedLost
          ? parsed.data.lossReasonCode ?? null
          : null,
        competitorCode: parsed.data.competitorCode ?? null,
        closeNotes: parsed.data.closeNotes ?? null,
        closedAt:
          targetStage.isClosedWon || targetStage.isClosedLost ? new Date() : null,
        updatedBy: context.platformUserId,
      },
      parsed.data.version
    );

    if (!updated) {
      throw new OpportunityError(
        "VERSION_CONFLICT",
        "This opportunity was updated by someone else. Refresh and try again.",
        409
      );
    }

    const eventType = targetStage.isClosedWon
      ? PARTY_TIMELINE_EVENT_TYPES.OPPORTUNITY_WON
      : targetStage.isClosedLost
        ? PARTY_TIMELINE_EVENT_TYPES.OPPORTUNITY_LOST
        : PARTY_TIMELINE_EVENT_TYPES.STAGE_CHANGED;

    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: existing.partyId,
        eventType,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary:
          eventType === PARTY_TIMELINE_EVENT_TYPES.STAGE_CHANGED
            ? `Opportunity stage changed to ${targetStage.name} — ${existing.opportunityNumber}`
            : `${targetStage.name} — ${existing.opportunityNumber}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_OPPORTUNITY,
        referenceId: opportunityId,
        metadata: { stageCode: targetStage.code, statusCode },
      })
    );

    if (targetStage.isClosedWon) {
      await this.maybePromoteCrmToActiveOnWin(context, existing.crmRecordId);
    }

    return this.getOpportunity(context, opportunityId);
  }

  async addLineItem(
    context: CurrentBusinessContext,
    opportunityId: string,
    payload: OpportunityLineItemPayload
  ): Promise<OpportunityDetailView> {
    const parsed = opportunityLineItemSchema.safeParse(payload);
    if (!parsed.success) {
      throw new OpportunityError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? "Invalid line item.",
        400
      );
    }

    const existing = await this.requireJoinedRow(context, opportunityId);

    if (!isOpportunityEditable(existing.statusCode)) {
      throw new OpportunityError(
        "OPPORTUNITY_READ_ONLY",
        OPPORTUNITY_USER_MESSAGES.OPPORTUNITY_READ_ONLY,
        409
      );
    }

    const db = getDb();
    const [productRow] = await db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.businessId, context.businessId),
          eq(product.id, parsed.data.productId),
          eq(product.isActive, true),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    if (!productRow) {
      throw new OpportunityError("PRODUCT_NOT_FOUND", "The selected offering was not found.", 404);
    }

    const quantity = parsed.data.quantity ?? "1";
    const unitPrice = parsed.data.unitPrice ?? null;
    const lineAmount =
      unitPrice && quantity
        ? (Number(unitPrice) * Number(quantity)).toFixed(2)
        : null;

    await this.opportunityRepository.insertLineItem(opportunityId, {
      productId: parsed.data.productId,
      quantity,
      unitPrice,
      lineAmount,
      notes: parsed.data.notes ?? null,
    });

    return this.getOpportunity(context, opportunityId);
  }

  async getOpenOpportunitiesWidgetSummary(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<OpenOpportunitiesWidgetSummary> {
    const [openRows, totals] = await Promise.all([
      this.opportunityRepository.listOpenByPartyId(context.businessId, partyId),
      this.opportunityRepository.sumOpenPipelineValue(context.businessId),
    ]);

    const partyOpen = openRows.filter((row) => row.partyId === partyId);
    const summaries = await Promise.all(
      partyOpen.map((row) => this.toSummaryView(context, row))
    );

    return {
      openCount: summaries.length,
      pipelineValue: totals.pipelineValue,
      weightedForecast: totals.weightedForecast,
      largestOpportunity: summaries[0] ?? null,
    };
  }

  private async recordOpportunityCreatedTimeline(
    context: CurrentBusinessContext,
    row: { id: string; partyId: string; opportunityNumber: string }
  ) {
    await this.timelineService.recordEvent(
      buildTimelineEventFromContext(context, {
        partyId: row.partyId,
        eventType: PARTY_TIMELINE_EVENT_TYPES.OPPORTUNITY_CREATED,
        eventCategory: PARTY_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        sourceModule: PARTY_TIMELINE_SOURCE_MODULES.CRM,
        summary: `Opportunity created — ${row.opportunityNumber}`,
        referenceEntity: AUDIT_ENTITY_NAMES.CRM_OPPORTUNITY,
        referenceId: row.id,
      })
    );
  }

  private async requireJoinedRow(
    context: CurrentBusinessContext,
    opportunityId: string
  ): Promise<OpportunityJoinedRow> {
    const row = await this.opportunityRepository.findByIdJoined(
      context.businessId,
      opportunityId
    );
    if (!row) {
      throw new OpportunityError(
        "OPPORTUNITY_NOT_FOUND",
        "The opportunity was not found.",
        404
      );
    }
    return row;
  }

  private async toSummaryView(
    context: CurrentBusinessContext,
    row: OpportunityJoinedRow
  ): Promise<OpportunitySummaryView> {
    const [stageName, pipelineName, ownerDisplayName] = await Promise.all([
      this.referenceRepository.getStageName(row.pipelineId, row.stageCode),
      this.referenceRepository.getPipelineName(
        (
          await this.referenceRepository.listActivePipelines()
        ).find((p) => p.id === row.pipelineId)?.code ?? DEFAULT_PIPELINE_CODE
      ),
      row.ownerPartyId
        ? this.crmReferenceRepository.findPartyDisplayName(
            context.businessId,
            row.ownerPartyId
          )
        : Promise.resolve(null),
    ]);

    const pipelineRow = (await this.referenceRepository.listActivePipelines()).find(
      (p) => p.id === row.pipelineId
    );

    return {
      opportunityId: row.id,
      opportunityNumber: row.opportunityNumber,
      name: row.name,
      crmRecordId: row.crmRecordId,
      partyId: row.partyId,
      displayName: row.partyDisplayName,
      statusCode: row.statusCode,
      statusName: row.statusCode,
      stageCode: row.stageCode,
      stageName,
      pipelineCode: pipelineRow?.code ?? DEFAULT_PIPELINE_CODE,
      pipelineName,
      ownerPartyId: row.ownerPartyId,
      ownerDisplayName,
      amount: row.amount,
      currencyCode: row.currencyCode,
      probability: row.probability,
      weightedAmount: row.weightedAmount,
      expectedCloseDate: row.expectedCloseDate ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDetailView(
    context: CurrentBusinessContext,
    row: OpportunityJoinedRow
  ): Promise<OpportunityDetailView> {
    const summary = await this.toSummaryView(context, row);
    const [branchName, primaryContactDisplayName, lossReasonName, lineItems, accountName] =
      await Promise.all([
        row.branchId
          ? this.crmReferenceRepository.getBranchName(context.businessId, row.branchId)
          : Promise.resolve(null),
        row.primaryContactPartyId
          ? this.crmReferenceRepository.findPartyDisplayName(
              context.businessId,
              row.primaryContactPartyId
            )
          : Promise.resolve(null),
        row.lossReasonCode
          ? this.referenceRepository.getLossReasonName(row.lossReasonCode)
          : Promise.resolve(null),
        this.opportunityRepository.listLineItems(row.id),
        row.accountId
          ? this.accountRepository
              .findById(context.businessId, row.accountId)
              .then((account) => account?.name ?? null)
          : Promise.resolve(null),
      ]);

    const assignmentSummary = await this.workAssignmentService.getSummary(
      context,
      WORK_SUBJECT_TYPES.CRM_OPPORTUNITY,
      row.id
    );

    return {
      ...summary,
      accountId: row.accountId,
      accountName,
      sourceLeadId: row.sourceLeadId,
      sourceLeadNumber: row.sourceLeadNumber,
      branchId: row.branchId,
      branchName,
      primaryContactPartyId: row.primaryContactPartyId,
      primaryContactDisplayName,
      lossReasonCode: row.lossReasonCode,
      lossReasonName,
      competitorCode: row.competitorCode,
      closeNotes: row.closeNotes,
      closedAt: row.closedAt?.toISOString() ?? null,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      version: row.version,
      lineItems: lineItems.map((item) => ({
        lineItemId: item.id,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
        notes: item.notes,
      })),
      assignmentSummary,
    };
  }

  private async resolveOptionalAccountId(
    businessId: string,
    accountId: string | null | undefined
  ): Promise<string | null> {
    if (accountId === undefined || accountId === null) {
      return null;
    }

    const account = await this.accountRepository.findById(businessId, accountId);
    if (!account) {
      throw new OpportunityError(
        "INVALID_INPUT",
        "The selected account was not found.",
        400
      );
    }

    return account.id;
  }

  private async maybePromoteCrmToActiveOnWin(
    context: CurrentBusinessContext,
    crmRecordId: string
  ): Promise<void> {
    const settings =
      await this.businessConfigurationRepository.findSettingsByBusinessId(
        context.businessId
      );
    const conversionConfig = resolveLeadConversionConfig(settings);

    if (!conversionConfig.promoteCrmToActiveOnWin) {
      return;
    }

    const crmRecord = await this.crmRepository.findByIdJoined(
      context.businessId,
      crmRecordId
    );
    if (!crmRecord || !isCrmStatusCode(crmRecord.statusCode)) {
      return;
    }

    const currentStatus = crmRecord.statusCode as CrmStatusCode;
    if (
      !canTransitionCrmStatus(currentStatus, CRM_STATUS_CODES.ACTIVE) ||
      currentStatus === CRM_STATUS_CODES.ACTIVE
    ) {
      return;
    }

    await this.crmRepository.updateById(
      context.businessId,
      crmRecordId,
      {
        statusCode: CRM_STATUS_CODES.ACTIVE,
        updatedBy: context.platformUserId,
      },
      crmRecord.version
    );
  }
}

export function createOpportunityService(): OpportunityService {
  return new OpportunityService();
}
