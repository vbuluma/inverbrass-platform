/**
 * Purpose:
 * Product Lifecycle orchestration — governed transitions, versioning, approval.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline";
import {
  DEFAULT_PRODUCT_LIFECYCLE_POLICIES,
  PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES,
  PRODUCT_LIFECYCLE_EVENT_TYPES,
  PRODUCT_LIFECYCLE_STATE_CODES,
  type ProductLifecycleStateCode,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductLifecycleEventRepository } from "@/modules/product/repositories/product-lifecycle-event-repository";
import { createProductLifecycleRepository } from "@/modules/product/repositories/product-lifecycle-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  canActivate,
  canApprove,
  canArchive,
  canAssignReplacement,
  canCreateNewVersion,
  canDeprecate,
  canReactivate,
  canSubmitForApproval,
  canSuspend,
  canTransitionLifecycleState,
  getAvailableLifecycleActions,
  hasValidEffectiveDates,
  incrementVersion,
  isLifecycleReadOnly,
  isProductLifecycleStateCode,
  isSelfReplacement,
  mapLifecycleStateToProductStatus,
  todayIsoDate,
} from "@/modules/product/services/product-lifecycle-rules";
import type {
  ProductLifecycleDashboardView,
  ProductLifecyclePanelView,
  ScheduleLifecycleActionPayload,
  SetReplacementProductPayload,
} from "@/modules/product/types";
import {
  scheduleLifecycleActionSchema,
  setReplacementProductSchema,
} from "@/modules/product/validators/product-lifecycle-validators";

type LifecycleRow = NonNullable<
  Awaited<
    ReturnType<
      ReturnType<typeof createProductLifecycleRepository>["findByProductId"]
    >
  >
>;

export class ProductLifecycleService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly lifecycleRepository = createProductLifecycleRepository(),
    private readonly lifecycleEventRepository = createProductLifecycleEventRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getLifecyclePanel(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductLifecyclePanelView> {
    await this.requireProduct(context, productId);
    const lifecycle = await this.ensureLifecycle(context, productId);

    const replacementProduct = lifecycle.replacementProductId
      ? await this.productRepository.findById(
          context.businessId,
          lifecycle.replacementProductId
        )
      : null;

    const events = await this.lifecycleEventRepository.listByProductId(
      context.businessId,
      productId
    );

    const currentState = this.resolveState(lifecycle.currentState);

    return {
      lifecycleId: lifecycle.id,
      productId,
      currentState,
      previousState: lifecycle.previousState,
      effectiveFrom: lifecycle.effectiveFrom,
      effectiveTo: lifecycle.effectiveTo,
      approvalRequired: lifecycle.approvalRequired,
      approvalStatus: lifecycle.approvalStatus,
      retirementReason: lifecycle.retirementReason,
      replacementProductId: lifecycle.replacementProductId,
      replacementProductName: replacementProduct?.productName ?? null,
      replacementProductCode: replacementProduct?.productCode ?? null,
      versionNumber: lifecycle.versionNumber,
      majorVersion: lifecycle.majorVersion,
      minorVersion: lifecycle.minorVersion,
      scheduledAction: lifecycle.scheduledAction,
      scheduledAt: lifecycle.scheduledAt,
      availableActions: getAvailableLifecycleActions(
        currentState,
        lifecycle.approvalStatus,
        DEFAULT_PRODUCT_LIFECYCLE_POLICIES
      ),
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        oldState: event.oldState,
        newState: event.newState,
        reason: event.reason,
        performedAt: event.performedAt.toISOString(),
      })),
      isReadOnly: isLifecycleReadOnly(currentState),
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<ProductLifecycleDashboardView> {
    const states = Object.values(PRODUCT_LIFECYCLE_STATE_CODES);
    const counts = await Promise.all(
      states.map(async (state) => ({
        state,
        count: await this.lifecycleRepository.countByState(
          context.businessId,
          state
        ),
      }))
    );

    const recentRows = await this.lifecycleRepository.listRecentlyChanged(
      context.businessId,
      10
    );

    const productIds = recentRows.map((row) => row.productId);
    const products = await Promise.all(
      productIds.map((id) =>
        this.productRepository.findById(context.businessId, id)
      )
    );
    const productById = new Map(
      products.filter(Boolean).map((p) => [p!.id, p!])
    );

    return {
      kpis: counts.map(({ state, count }) => ({
        state,
        count,
      })),
      recentlyChanged: recentRows.map((row) => {
        const product = productById.get(row.productId);
        return {
          productId: row.productId,
          productCode: product?.productCode ?? "—",
          productName: product?.productName ?? "Unknown",
          currentState: row.currentState,
          versionNumber: row.versionNumber,
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    };
  }

  async submitForApproval(
    context: CurrentBusinessContext,
    productId: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canSubmitForApproval(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product cannot be submitted for approval in its current state.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.PENDING_APPROVAL,
      PRODUCT_LIFECYCLE_EVENT_TYPES.SUBMITTED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_STATUS_CHANGED,
      "Submitted for approval",
      {
        approvalStatus: PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.PENDING,
      },
      reason
    );
  }

  async approve(
    context: CurrentBusinessContext,
    productId: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canApprove(currentState, lifecycle.approvalStatus)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product is not pending approval.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.APPROVED,
      PRODUCT_LIFECYCLE_EVENT_TYPES.APPROVED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_STATUS_CHANGED,
      "Approved",
      {
        approvalStatus: PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.APPROVED,
      },
      reason
    );
  }

  async reject(
    context: CurrentBusinessContext,
    productId: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canApprove(currentState, lifecycle.approvalStatus)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product is not pending approval.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.DRAFT,
      PRODUCT_LIFECYCLE_EVENT_TYPES.REJECTED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_STATUS_CHANGED,
      "Approval rejected",
      {
        approvalStatus: PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.REJECTED,
      },
      reason
    );
  }

  async activate(
    context: CurrentBusinessContext,
    productId: string,
    effectiveFrom?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canActivate(currentState, lifecycle.approvalStatus)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product cannot be activated in its current state.",
        400
      );
    }

    const activeCount = await this.lifecycleRepository.countActiveVersions(
      context.businessId
    );
    if (
      activeCount >= DEFAULT_PRODUCT_LIFECYCLE_POLICIES.maximumActiveVersions &&
      currentState !== PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE
    ) {
      const existingActive = await this.lifecycleRepository.findByProductId(
        context.businessId,
        productId
      );
      if (existingActive?.currentState !== PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE) {
        throw new ProductError(
          "MAX_ACTIVE_VERSIONS_EXCEEDED",
          "Maximum number of active product versions reached.",
          409
        );
      }
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE,
      PRODUCT_LIFECYCLE_EVENT_TYPES.ACTIVATED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_ACTIVATED,
      "Activated",
      {
        effectiveFrom: effectiveFrom?.trim() || todayIsoDate(),
        approvalStatus:
          lifecycle.approvalStatus ??
          PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.NOT_REQUIRED,
      }
    );
  }

  async suspend(
    context: CurrentBusinessContext,
    productId: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canSuspend(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "Only active products can be suspended.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.SUSPENDED,
      PRODUCT_LIFECYCLE_EVENT_TYPES.SUSPENDED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_SUSPENDED,
      "Suspended",
      {},
      reason
    );
  }

  async reactivate(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canReactivate(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product cannot be reactivated.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.ACTIVE,
      PRODUCT_LIFECYCLE_EVENT_TYPES.REACTIVATED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_ACTIVATED,
      "Reactivated"
    );
  }

  async deprecate(
    context: CurrentBusinessContext,
    productId: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canDeprecate(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product cannot be deprecated.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED,
      PRODUCT_LIFECYCLE_EVENT_TYPES.DEPRECATED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_STATUS_CHANGED,
      "Deprecated",
      {},
      reason
    );
  }

  async discontinue(
    context: CurrentBusinessContext,
    productId: string,
    retirementReason: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (currentState !== PRODUCT_LIFECYCLE_STATE_CODES.DEPRECATED) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "Only deprecated products can be discontinued.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.DISCONTINUED,
      PRODUCT_LIFECYCLE_EVENT_TYPES.DISCONTINUED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_STATUS_CHANGED,
      "Discontinued",
      { retirementReason: retirementReason.trim() },
      reason
    );
  }

  async archive(
    context: CurrentBusinessContext,
    productId: string,
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canArchive(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "This product cannot be archived in its current state.",
        400
      );
    }

    return this.transition(
      context,
      productId,
      lifecycle,
      PRODUCT_LIFECYCLE_STATE_CODES.ARCHIVED,
      PRODUCT_LIFECYCLE_EVENT_TYPES.ARCHIVED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_ARCHIVED,
      "Archived",
      { effectiveTo: todayIsoDate() },
      reason
    );
  }

  async createNewVersion(
    context: CurrentBusinessContext,
    productId: string,
    isMajor = false
  ): Promise<ProductLifecyclePanelView> {
    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canCreateNewVersion(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "Cannot create a new version in the current state.",
        400
      );
    }

    const nextVersion = incrementVersion(
      lifecycle.majorVersion,
      lifecycle.minorVersion,
      isMajor
    );

    await this.lifecycleRepository.updateById(
      context.businessId,
      lifecycle.id,
      {
        versionNumber: nextVersion.versionNumber,
        majorVersion: nextVersion.majorVersion,
        minorVersion: nextVersion.minorVersion,
        updatedBy: context.platformUserId,
      }
    );

    await this.recordLifecycleEvent(context, productId, {
      eventType: PRODUCT_LIFECYCLE_EVENT_TYPES.VERSION_CREATED,
      oldState: lifecycle.currentState,
      newState: lifecycle.currentState,
      reason: `Version ${nextVersion.versionNumber} created`,
    });

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_STATUS_CHANGED,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        summary: `New version ${nextVersion.versionNumber} created`,
        referenceEntity: "product_lifecycle",
        referenceId: lifecycle.id,
      })
    );

    return this.getLifecyclePanel(context, productId);
  }

  async setReplacementProduct(
    context: CurrentBusinessContext,
    productId: string,
    payload: SetReplacementProductPayload
  ): Promise<ProductLifecyclePanelView> {
    const parsed = setReplacementProductSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const lifecycle = await this.requireLifecycle(context, productId);
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canAssignReplacement(currentState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        "Replacement cannot be assigned in the current state.",
        400
      );
    }

    if (isSelfReplacement(productId, parsed.data.replacementProductId)) {
      throw new ProductError(
        "SELF_REPLACEMENT_NOT_ALLOWED",
        "A product cannot replace itself.",
        400,
        "replacementProductId"
      );
    }

    const replacement = await this.productRepository.findById(
      context.businessId,
      parsed.data.replacementProductId
    );
    if (!replacement) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        "Replacement product not found.",
        404,
        "replacementProductId"
      );
    }

    await this.lifecycleRepository.updateById(
      context.businessId,
      lifecycle.id,
      {
        replacementProductId: parsed.data.replacementProductId,
        retirementReason:
          parsed.data.retirementReason?.trim() ??
          lifecycle.retirementReason ??
          "REPLACEMENT",
        updatedBy: context.platformUserId,
      }
    );

    await this.recordLifecycleEvent(context, productId, {
      eventType: PRODUCT_LIFECYCLE_EVENT_TYPES.REPLACEMENT_ASSIGNED,
      oldState: lifecycle.currentState,
      newState: lifecycle.currentState,
      reason: `Replacement set to ${replacement.productName}`,
    });

    return this.getLifecyclePanel(context, productId);
  }

  async scheduleAction(
    context: CurrentBusinessContext,
    productId: string,
    payload: ScheduleLifecycleActionPayload
  ): Promise<ProductLifecyclePanelView> {
    const parsed = scheduleLifecycleActionSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const lifecycle = await this.requireLifecycle(context, productId);

    await this.lifecycleRepository.updateById(
      context.businessId,
      lifecycle.id,
      {
        scheduledAction: parsed.data.scheduledAction,
        scheduledAt: parsed.data.scheduledAt,
        updatedBy: context.platformUserId,
      }
    );

    await this.recordLifecycleEvent(context, productId, {
      eventType: PRODUCT_LIFECYCLE_EVENT_TYPES.SCHEDULE_SET,
      oldState: lifecycle.currentState,
      newState: lifecycle.currentState,
      reason: `${parsed.data.scheduledAction} scheduled for ${parsed.data.scheduledAt}`,
    });

    return this.getLifecyclePanel(context, productId);
  }

  private async transition(
    context: CurrentBusinessContext,
    productId: string,
    lifecycle: LifecycleRow,
    nextState: ProductLifecycleStateCode,
    lifecycleEventType: string,
    timelineEventType: string,
    summary: string,
    extraUpdates: Record<string, unknown> = {},
    reason?: string
  ): Promise<ProductLifecyclePanelView> {
    const currentState = this.resolveState(lifecycle.currentState);

    if (!canTransitionLifecycleState(currentState, nextState)) {
      throw new ProductError(
        "INVALID_LIFECYCLE_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_LIFECYCLE_TRANSITION,
        400
      );
    }

    const effectiveFrom =
      typeof extraUpdates.effectiveFrom === "string"
        ? extraUpdates.effectiveFrom
        : lifecycle.effectiveFrom;
    const effectiveTo =
      typeof extraUpdates.effectiveTo === "string"
        ? extraUpdates.effectiveTo
        : lifecycle.effectiveTo;

    if (!hasValidEffectiveDates(effectiveFrom, effectiveTo)) {
      throw new ProductError(
        "INVALID_EFFECTIVE_DATES",
        "Effective From must be before Effective To.",
        400
      );
    }

    await this.lifecycleRepository.updateById(
      context.businessId,
      lifecycle.id,
      {
        currentState: nextState,
        previousState: lifecycle.currentState,
        effectiveFrom: effectiveFrom ?? null,
        effectiveTo: effectiveTo ?? null,
        ...(extraUpdates.approvalStatus !== undefined
          ? { approvalStatus: extraUpdates.approvalStatus as string }
          : {}),
        ...(extraUpdates.retirementReason !== undefined
          ? { retirementReason: extraUpdates.retirementReason as string }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    const productStatus = mapLifecycleStateToProductStatus(nextState);
    await this.productRepository.updateById(context.businessId, productId, {
      statusCode: productStatus,
      updatedBy: context.platformUserId,
    });

    await this.recordLifecycleEvent(context, productId, {
      eventType: lifecycleEventType,
      oldState: lifecycle.currentState,
      newState: nextState,
      reason: reason?.trim() || summary,
    });

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: timelineEventType,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        summary: `${summary} — ${currentState} → ${nextState}`,
        referenceEntity: "product_lifecycle",
        referenceId: lifecycle.id,
      })
    );

    const product = await this.productRepository.findById(
      context.businessId,
      productId
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId,
      ownerPartyId: product?.ownerPartyId ?? null,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_LIFECYCLE,
      entityId: lifecycle.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_LIFECYCLE,
      before: { currentState: lifecycle.currentState },
      after: { currentState: nextState },
      trackFields: ["currentState", "approvalStatus", "versionNumber"],
    });

    return this.getLifecyclePanel(context, productId);
  }

  private async ensureLifecycle(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<LifecycleRow> {
    const existing = await this.lifecycleRepository.findByProductId(
      context.businessId,
      productId
    );

    if (existing) {
      return existing;
    }

    const product = await this.requireProduct(context, productId);

    const row = await this.lifecycleRepository.insert({
      businessId: context.businessId,
      productId,
      currentState: PRODUCT_LIFECYCLE_STATE_CODES.DRAFT,
      approvalRequired: DEFAULT_PRODUCT_LIFECYCLE_POLICIES.approvalRequiredBeforeActivation,
      approvalStatus: PRODUCT_LIFECYCLE_APPROVAL_STATUS_CODES.NOT_REQUIRED,
      effectiveFrom: product.launchDate ?? null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.recordLifecycleEvent(context, productId, {
      eventType: PRODUCT_LIFECYCLE_EVENT_TYPES.LIFECYCLE_CREATED,
      newState: PRODUCT_LIFECYCLE_STATE_CODES.DRAFT,
      reason: "Lifecycle initialized",
    });

    return row;
  }

  private async requireLifecycle(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<LifecycleRow> {
    await this.requireProduct(context, productId);
    const lifecycle = await this.ensureLifecycle(context, productId);
    return lifecycle;
  }

  private async requireProduct(
    context: CurrentBusinessContext,
    productId: string
  ) {
    const product = await this.productRepository.findById(
      context.businessId,
      productId
    );
    if (!product) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }
    return product;
  }

  private resolveState(value: string): ProductLifecycleStateCode {
    if (isProductLifecycleStateCode(value)) {
      return value;
    }
    return PRODUCT_LIFECYCLE_STATE_CODES.DRAFT;
  }

  private async recordLifecycleEvent(
    context: CurrentBusinessContext,
    productId: string,
    input: {
      eventType: string;
      oldState?: string | null;
      newState?: string | null;
      reason?: string | null;
    }
  ) {
    await this.lifecycleEventRepository.insert({
      businessId: context.businessId,
      productId,
      eventType: input.eventType,
      oldState: input.oldState ?? null,
      newState: input.newState ?? null,
      reason: input.reason ?? null,
      performedBy: context.platformUserId,
    });
  }
}

export function createProductLifecycleService(): ProductLifecycleService {
  return new ProductLifecycleService();
}
