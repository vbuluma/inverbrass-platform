/**
 * Purpose:
 * Offering Governance orchestration — ownership, readiness, validation, history.
 *
 * Architecture:
 * Server Actions → OfferingGovernanceService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline";
import { getDb } from "@/db/client";
import { ensureOfferingGovernanceDefaults } from "@/db/seeds/offering-governance-defaults-seed";
import {
  OFFERING_GOVERNANCE_CHANGE_TYPES,
  OFFERING_GOVERNANCE_STATUS_CODES,
  type ProductStatusCode,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createOfferingGovernanceChecklistDefinitionRepository } from "@/modules/product/repositories/offering-governance-checklist-definition-repository";
import { createOfferingGovernanceHistoryRepository } from "@/modules/product/repositories/offering-governance-history-repository";
import { createOfferingGovernanceRepository } from "@/modules/product/repositories/offering-governance-repository";
import { createOfferingMetricSnapshotRepository } from "@/modules/product/repositories/offering-metric-snapshot-repository";
import { createPricingItemRepository } from "@/modules/product/repositories/pricing-item-repository";
import { createProductClassificationAssignmentRepository } from "@/modules/product/repositories/product-classification-assignment-repository";
import { createProductReferenceRepository } from "@/modules/product/repositories/product-reference-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  buildValidationResults,
  calculateReadinessScore,
  checklistStatusLabel,
  deriveGovernanceStatus,
  evaluateChecklistItem,
  formatReadinessScore,
  governanceStatusLabel,
  type ChecklistEvaluationResult,
  type GovernanceEvaluationContext,
} from "@/modules/product/services/offering-governance-rules";
import { isProductEditable } from "@/modules/product/services/product-rules";
import type {
  OfferingGovernanceDashboardView,
  OfferingGovernanceFiltersPayload,
  ProductGovernancePanelView,
  RunOfferingGovernanceValidationPayload,
  ToggleOfferingGovernanceLockPayload,
  UpdateOfferingGovernanceNotesPayload,
  UpdateOfferingGovernanceOwnershipPayload,
} from "@/modules/product/types";
import {
  offeringGovernanceFiltersSchema,
  runOfferingGovernanceValidationSchema,
  toggleOfferingGovernanceLockSchema,
  updateOfferingGovernanceNotesSchema,
  updateOfferingGovernanceOwnershipSchema,
} from "@/modules/product/validators/offering-governance-validators";

export class OfferingGovernanceService {
  constructor(
    private readonly governanceRepository = createOfferingGovernanceRepository(),
    private readonly historyRepository = createOfferingGovernanceHistoryRepository(),
    private readonly checklistRepository = createOfferingGovernanceChecklistDefinitionRepository(),
    private readonly productRepository = createProductRepository(),
    private readonly referenceRepository = createProductReferenceRepository(),
    private readonly assignmentRepository = createProductClassificationAssignmentRepository(),
    private readonly pricingItemRepository = createPricingItemRepository(),
    private readonly snapshotRepository = createOfferingMetricSnapshotRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async ensureDefaults(context: CurrentBusinessContext): Promise<void> {
    await ensureOfferingGovernanceDefaults(context.businessId, getDb());
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<OfferingGovernanceDashboardView> {
    await this.ensureDefaults(context);

    const profile =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );

    const [rows, statusCounts] = await Promise.all([
      this.governanceRepository.search(context.businessId),
      this.governanceRepository.countByStatus(context.businessId),
    ]);

    const readyCount =
      statusCounts.find(
        (row) => row.status === OFFERING_GOVERNANCE_STATUS_CODES.READY
      )?.count ?? 0;
    const nonCompliantCount =
      statusCounts.find(
        (row) => row.status === OFFERING_GOVERNANCE_STATUS_CODES.NON_COMPLIANT
      )?.count ?? 0;

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

    return {
      governanceCount: rows.length,
      readyCount: Number(readyCount),
      nonCompliantCount: Number(nonCompliantCount),
      averageReadiness,
      statusSummary: statusCounts.map((row) => ({
        status: row.status,
        statusLabel: governanceStatusLabel(row.status),
        count: Number(row.count),
      })),
      recentGovernance: rows.slice(0, 10).map((row) => ({
        offeringId: row.governance.offeringId,
        offeringCode: row.offeringCode,
        offeringName: row.offeringName,
        governanceStatus: row.governance.governanceStatus,
        governanceStatusLabel: governanceStatusLabel(
          row.governance.governanceStatus
        ),
        readinessScore: Number(row.governance.readinessScore),
        businessOwnerName: row.businessOwnerName,
      })),
      catalogueLabel: profile.offeringCatalogueNavLabel ?? "Products",
    };
  }

  async getProductGovernancePanel(
    context: CurrentBusinessContext,
    offeringId: string,
    payload: OfferingGovernanceFiltersPayload = {}
  ): Promise<ProductGovernancePanelView> {
    await this.ensureDefaults(context);

    const parsed = offeringGovernanceFiltersSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const product = await this.requireOffering(context.businessId, offeringId);
    let governance = await this.governanceRepository.findByOfferingId(
      context.businessId,
      offeringId
    );

    if (!governance) {
      governance = await this.governanceRepository.insert({
        businessId: context.businessId,
        offeringId,
        governanceStatus: OFFERING_GOVERNANCE_STATUS_CODES.NOT_STARTED,
        readinessScore: "0",
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      });

      await recordProductEntityAudit(this.auditService, context, {
        entityName: AUDIT_ENTITY_NAMES.OFFERING_GOVERNANCE,
        entityId: governance.id,
        operation: AUDIT_OPERATIONS.CREATE,
        sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
        productId: offeringId,
        ownerPartyId: product.ownerPartyId,
        createValues: governance as unknown as Record<string, unknown>,
      });
    }

    const evaluation = await this.evaluateGovernance(
      context.businessId,
      product,
      governance
    );

    const [statusName, ownerOptions, history] = await Promise.all([
      this.referenceRepository.getProductStatusName(product.statusCode),
      this.referenceRepository.listOwnerPartyOptions(context.businessId),
      this.historyRepository.listByGovernanceId(
        context.businessId,
        governance.id
      ),
    ]);

    const statusOptions = Object.values(OFFERING_GOVERNANCE_STATUS_CODES).map(
      (code) => ({
        code,
        name: governanceStatusLabel(code),
      })
    );

    const [
      businessOwnerName,
      technicalOwnerName,
      stewardName,
    ] = await Promise.all([
      this.resolvePartyName(
        context.businessId,
        governance.responsibleBusinessOwnerPartyId
      ),
      this.resolvePartyName(context.businessId, governance.technicalOwnerPartyId),
      this.resolvePartyName(context.businessId, governance.productStewardPartyId),
    ]);

    return {
      offeringId,
      offeringCode: product.productCode,
      offeringName: product.productName,
      statusCode: product.statusCode,
      statusName,
      governanceId: governance.id,
      governanceStatus: governance.governanceStatus,
      governanceStatusLabel: governanceStatusLabel(governance.governanceStatus),
      readinessScore: evaluation.score,
      readinessScoreLabel: formatReadinessScore(evaluation.score),
      lastValidationDate: governance.lastValidationDate?.toISOString() ?? null,
      isLocked: governance.isLocked,
      notes: governance.notes,
      responsibleBusinessOwnerPartyId:
        governance.responsibleBusinessOwnerPartyId,
      responsibleBusinessOwnerName: businessOwnerName,
      technicalOwnerPartyId: governance.technicalOwnerPartyId,
      technicalOwnerName,
      productStewardPartyId: governance.productStewardPartyId,
      productStewardName: stewardName,
      ownerOptions,
      statusOptions,
      checklist: evaluation.checklist.map((item) => this.mapChecklistView(item)),
      validationResults: buildValidationResults(evaluation.checklist).map(
        (item) => ({
          ...item,
          statusLabel: checklistStatusLabel(
            item.status as Parameters<typeof checklistStatusLabel>[0]
          ),
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
      editable:
        isProductEditable(product.statusCode as ProductStatusCode) &&
        !governance.isLocked,
    };
  }

  async updateOwnership(
    context: CurrentBusinessContext,
    payload: UpdateOfferingGovernanceOwnershipPayload
  ): Promise<ProductGovernancePanelView> {
    const parsed = updateOfferingGovernanceOwnershipSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0]?.toString()
      );
    }

    const product = await this.requireOffering(
      context.businessId,
      parsed.data.offeringId
    );
    this.assertGovernanceEditable(product.statusCode as ProductStatusCode);

    const governance = await this.requireGovernance(
      context.businessId,
      parsed.data.offeringId
    );
    this.assertNotLocked(governance.isLocked);

    const businessOwnerId =
      parsed.data.responsibleBusinessOwnerPartyId?.trim() || null;
    const technicalOwnerId = parsed.data.technicalOwnerPartyId?.trim() || null;
    const stewardId = parsed.data.productStewardPartyId?.trim() || null;

    if (businessOwnerId) {
      await this.requireParty(context.businessId, businessOwnerId);
    }
    if (technicalOwnerId) {
      await this.requireParty(context.businessId, technicalOwnerId);
    }
    if (stewardId) {
      await this.requireParty(context.businessId, stewardId);
    }

    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        responsibleBusinessOwnerPartyId: businessOwnerId,
        technicalOwnerPartyId: technicalOwnerId,
        productStewardPartyId: stewardId,
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new ProductError(
        "GOVERNANCE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.GOVERNANCE_NOT_FOUND,
        404
      );
    }

    if (
      governance.responsibleBusinessOwnerPartyId !==
      updated.responsibleBusinessOwnerPartyId
    ) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.OWNER_CHANGED,
        oldValue: governance.responsibleBusinessOwnerPartyId,
        newValue: updated.responsibleBusinessOwnerPartyId,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_OWNER_CHANGED,
        summary: "Responsible Business Owner changed.",
      });
    }

    if (governance.productStewardPartyId !== updated.productStewardPartyId) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.STEWARD_CHANGED,
        oldValue: governance.productStewardPartyId,
        newValue: updated.productStewardPartyId,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_STEWARD_CHANGED,
        summary: "Product Steward changed.",
      });
    }

    await recordProductEntityAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.OFFERING_GOVERNANCE,
      entityId: updated.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      productId: parsed.data.offeringId,
      ownerPartyId: businessOwnerId,
      before: governance as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return this.runValidation(context, { offeringId: parsed.data.offeringId });
  }

  async updateNotes(
    context: CurrentBusinessContext,
    payload: UpdateOfferingGovernanceNotesPayload
  ): Promise<ProductGovernancePanelView> {
    const parsed = updateOfferingGovernanceNotesSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const product = await this.requireOffering(
      context.businessId,
      parsed.data.offeringId
    );
    this.assertGovernanceEditable(product.statusCode as ProductStatusCode);

    const governance = await this.requireGovernance(
      context.businessId,
      parsed.data.offeringId
    );
    this.assertNotLocked(governance.isLocked);

    const notes = parsed.data.notes?.trim() || null;
    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        notes,
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new ProductError(
        "GOVERNANCE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.GOVERNANCE_NOT_FOUND,
        404
      );
    }

    if (governance.notes !== updated.notes) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.NOTES_CHANGED,
        oldValue: governance.notes,
        newValue: updated.notes,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_UPDATED,
        summary: "Governance notes updated.",
      });
    }

    return this.getProductGovernancePanel(context, parsed.data.offeringId);
  }

  async toggleLock(
    context: CurrentBusinessContext,
    payload: ToggleOfferingGovernanceLockPayload
  ): Promise<ProductGovernancePanelView> {
    const parsed = toggleOfferingGovernanceLockSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const product = await this.requireOffering(
      context.businessId,
      parsed.data.offeringId
    );
    this.assertGovernanceEditable(product.statusCode as ProductStatusCode);

    const governance = await this.requireGovernance(
      context.businessId,
      parsed.data.offeringId
    );

    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        isLocked: parsed.data.isLocked,
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new ProductError(
        "GOVERNANCE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.GOVERNANCE_NOT_FOUND,
        404
      );
    }

    await this.recordHistoryAndTimeline(context, updated, {
      changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.LOCK_CHANGED,
      oldValue: String(governance.isLocked),
      newValue: String(updated.isLocked),
      eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_UPDATED,
      summary: updated.isLocked
        ? "Governance locked."
        : "Governance unlocked.",
    });

    return this.runValidation(context, { offeringId: parsed.data.offeringId });
  }

  async runValidation(
    context: CurrentBusinessContext,
    payload: RunOfferingGovernanceValidationPayload
  ): Promise<ProductGovernancePanelView> {
    const parsed = runOfferingGovernanceValidationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    const product = await this.requireOffering(
      context.businessId,
      parsed.data.offeringId
    );

    const governance = await this.requireGovernance(
      context.businessId,
      parsed.data.offeringId
    );

    const evaluation = await this.evaluateGovernance(
      context.businessId,
      product,
      governance
    );

    const nextStatus = deriveGovernanceStatus(
      product.statusCode as ProductStatusCode,
      governance.isLocked,
      evaluation.score,
      evaluation.checklist,
      Boolean(governance.responsibleBusinessOwnerPartyId)
    );

    const updated = await this.governanceRepository.updateById(
      context.businessId,
      governance.id,
      {
        readinessScore: evaluation.score.toFixed(2),
        governanceStatus: nextStatus,
        lastValidationDate: new Date(),
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
      throw new ProductError(
        "GOVERNANCE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.GOVERNANCE_NOT_FOUND,
        404
      );
    }

    const scoreChanged =
      Number(governance.readinessScore) !== Number(updated.readinessScore);
    const statusChanged = governance.governanceStatus !== updated.governanceStatus;

    if (scoreChanged) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.READINESS_CHANGED,
        oldValue: governance.readinessScore,
        newValue: updated.readinessScore,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_READINESS_UPDATED,
        summary: `Readiness updated to ${formatReadinessScore(evaluation.score)}.`,
      });
    }

    if (statusChanged) {
      await this.recordHistoryAndTimeline(context, updated, {
        changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.STATUS_CHANGED,
        oldValue: governance.governanceStatus,
        newValue: updated.governanceStatus,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_UPDATED,
        summary: `Governance status changed to ${governanceStatusLabel(updated.governanceStatus)}.`,
      });
    }

    await this.recordHistoryAndTimeline(context, updated, {
      changeType: OFFERING_GOVERNANCE_CHANGE_TYPES.VALIDATION_EXECUTED,
      oldValue: null,
      newValue: formatReadinessScore(evaluation.score),
      eventType: PRODUCT_TIMELINE_EVENT_TYPES.GOVERNANCE_VALIDATION_EXECUTED,
      summary: "Governance validation executed.",
    });

    await recordProductEntityAudit(this.auditService, context, {
      entityName: AUDIT_ENTITY_NAMES.OFFERING_GOVERNANCE,
      entityId: updated.id,
      operation: AUDIT_OPERATIONS.VERIFY,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      productId: parsed.data.offeringId,
      ownerPartyId: governance.responsibleBusinessOwnerPartyId,
      before: governance as unknown as Record<string, unknown>,
      after: updated as unknown as Record<string, unknown>,
    });

    return this.getProductGovernancePanel(context, parsed.data.offeringId);
  }

  private async evaluateGovernance(
    businessId: string,
    product: Awaited<ReturnType<typeof this.requireOffering>>,
    governance: NonNullable<
      Awaited<ReturnType<typeof this.governanceRepository.findByOfferingId>>
    >
  ) {
    const [definitions, assignments, pricingItems, snapshotCount] =
      await Promise.all([
        this.checklistRepository.listActiveByBusinessId(businessId),
        this.assignmentRepository.listActiveByProductId(businessId, product.id),
        this.pricingItemRepository.listByOfferingId(businessId, product.id),
        this.snapshotRepository.countByOffering(businessId, product.id),
      ]);

    const context: GovernanceEvaluationContext = {
      productCode: product.productCode,
      productName: product.productName,
      productType: product.productTypeCode,
      productStatusCode: product.statusCode as ProductStatusCode,
      responsibleBusinessOwnerPartyId:
        governance.responsibleBusinessOwnerPartyId,
      classificationCount: assignments.length,
      pricingCount: pricingItems.length,
      analyticsSnapshotCount: snapshotCount,
    };

    const checklist = definitions.map((definition) =>
      evaluateChecklistItem(definition.evaluatorKey, definition, context)
    );

    const score = calculateReadinessScore(checklist);

    return { checklist, score };
  }

  private mapChecklistView(item: ChecklistEvaluationResult) {
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

  private changeTypeLabel(changeType: string): string {
    switch (changeType) {
      case OFFERING_GOVERNANCE_CHANGE_TYPES.OWNER_CHANGED:
        return "Owner Changed";
      case OFFERING_GOVERNANCE_CHANGE_TYPES.STEWARD_CHANGED:
        return "Steward Changed";
      case OFFERING_GOVERNANCE_CHANGE_TYPES.STATUS_CHANGED:
        return "Status Changed";
      case OFFERING_GOVERNANCE_CHANGE_TYPES.READINESS_CHANGED:
        return "Readiness Changed";
      case OFFERING_GOVERNANCE_CHANGE_TYPES.VALIDATION_EXECUTED:
        return "Validation Executed";
      case OFFERING_GOVERNANCE_CHANGE_TYPES.LOCK_CHANGED:
        return "Lock Changed";
      case OFFERING_GOVERNANCE_CHANGE_TYPES.NOTES_CHANGED:
        return "Notes Changed";
      default:
        return changeType;
    }
  }

  private async recordHistoryAndTimeline(
    context: CurrentBusinessContext,
    governance: NonNullable<
      Awaited<ReturnType<typeof this.governanceRepository.findByOfferingId>>
    >,
    input: {
      changeType: string;
      oldValue: string | null;
      newValue: string | null;
      eventType: (typeof PRODUCT_TIMELINE_EVENT_TYPES)[keyof typeof PRODUCT_TIMELINE_EVENT_TYPES];
      summary: string;
    }
  ) {
    await this.historyRepository.insert({
      businessId: context.businessId,
      offeringGovernanceId: governance.id,
      changeType: input.changeType,
      oldValue: input.oldValue,
      newValue: input.newValue,
      changedBy: context.platformUserId,
    });

    const event = buildProductTimelineEventFromContext(context, {
      productId: governance.offeringId,
      eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.GOVERNANCE,
      eventType: input.eventType,
      summary: input.summary,
      metadata: {
        governanceId: governance.id,
        changeType: input.changeType,
      },
    });

    await this.timelineService.recordEvent(event);
  }

  private async resolvePartyName(
    businessId: string,
    partyId: string | null
  ): Promise<string | null> {
    if (!partyId) {
      return null;
    }

    const party = await this.referenceRepository.findOwnerParty(
      businessId,
      partyId
    );
    return party?.displayName ?? null;
  }

  private async requireParty(businessId: string, partyId: string) {
    const party = await this.referenceRepository.findOwnerParty(
      businessId,
      partyId
    );
    if (!party) {
      throw new ProductError(
        "OWNER_PARTY_NOT_FOUND",
        PRODUCT_USER_MESSAGES.OWNER_PARTY_NOT_FOUND,
        404,
        "ownerPartyId"
      );
    }
    return party;
  }

  private assertGovernanceEditable(statusCode: ProductStatusCode) {
    if (!isProductEditable(statusCode)) {
      throw new ProductError(
        "GOVERNANCE_IMMUTABLE",
        PRODUCT_USER_MESSAGES.GOVERNANCE_IMMUTABLE,
        409
      );
    }
  }

  private assertNotLocked(isLocked: boolean) {
    if (isLocked) {
      throw new ProductError(
        "GOVERNANCE_LOCKED",
        PRODUCT_USER_MESSAGES.GOVERNANCE_LOCKED,
        409
      );
    }
  }

  private async requireGovernance(businessId: string, offeringId: string) {
    const governance = await this.governanceRepository.findByOfferingId(
      businessId,
      offeringId
    );
    if (!governance) {
      throw new ProductError(
        "GOVERNANCE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.GOVERNANCE_NOT_FOUND,
        404
      );
    }
    return governance;
  }

  private async requireOffering(businessId: string, offeringId: string) {
    const row = await this.productRepository.findById(businessId, offeringId);
    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }
    return row;
  }
}

export function createOfferingGovernanceService() {
  return new OfferingGovernanceService();
}
