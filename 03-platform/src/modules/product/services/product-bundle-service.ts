/**
 * Purpose:
 * Product Bundles Engine — CRUD, lifecycle, items, search.
 *
 * Architecture:
 * Server Actions → ProductBundleService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildBundleTimelineEventFromContext,
  createBundleTimelineService,
  BUNDLE_TIMELINE_EVENT_CATEGORIES,
  BUNDLE_TIMELINE_EVENT_TYPES,
  BUNDLE_TIMELINE_SOURCE_MODULES,
} from "@/core/bundle-timeline";
import { resolveBundleLabel } from "@/core/industry-experience/bundle-terminology";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline";
import {
  BUNDLE_AVAILABILITY_TYPE_LABELS,
  BUNDLE_AVAILABILITY_TYPES,
  BUNDLE_PRICING_STRATEGY_LABELS,
  BUNDLE_PRICING_STRATEGY_CODES,
  BUNDLE_STATUS_CODES,
  PRODUCT_STATUS_CODES,
  VARIANT_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductBundleItemRepository } from "@/modules/product/repositories/product-bundle-item-repository";
import { createProductBundleRepository } from "@/modules/product/repositories/product-bundle-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { createProductVariantRepository } from "@/modules/product/repositories/product-variant-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import { createProductBundleAuditQueryService } from "@/modules/product/services/product-bundle-audit-query-service";
import {
  bundleStatusLabel,
  bundleTypeLabel,
  bundleTypeOptions,
  canTransitionBundleStatus,
  findDuplicateBundleItemKeys,
  isBundleEditable,
  isProductBundleable,
  normalizeBundleCode,
  resolveDefaultBundleStatus,
  type BundleItemInput,
} from "@/modules/product/services/product-bundle-rules";
import type {
  AddBundleItemPayload,
  BundleDashboardView,
  BundleProductSearchResult,
  BundleRegistrationCataloguesView,
  BundleWorkspaceView,
  CreateBundlePayload,
  ProductBundleItemView,
  ProductBundleView,
  ProductBundlesPanelView,
  SearchBundlesPayload,
  UpdateBundleItemPayload,
  UpdateBundlePayload,
} from "@/modules/product/types";
import {
  addBundleItemSchema,
  createBundleSchema,
  searchBundlesSchema,
  updateBundleItemSchema,
  updateBundleSchema,
} from "@/modules/product/validators/product-bundle-validators";

type ProductRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createProductRepository>["findById"]>>
>;

type BundleRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createProductBundleRepository>["findById"]>>
>;

export class ProductBundleService {
  constructor(
    private readonly bundleRepository = createProductBundleRepository(),
    private readonly bundleItemRepository = createProductBundleItemRepository(),
    private readonly productRepository = createProductRepository(),
    private readonly variantRepository = createProductVariantRepository(),
    private readonly bundleTimelineService = createBundleTimelineService(),
    private readonly productTimelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly auditQueryService = createProductBundleAuditQueryService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getDashboard(context: CurrentBusinessContext): Promise<BundleDashboardView> {
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const [rows, activeCount, draftCount, archivedCount] = await Promise.all([
      this.bundleRepository.listByBusinessId(context.businessId),
      this.bundleRepository.countByStatus(
        context.businessId,
        BUNDLE_STATUS_CODES.ACTIVE
      ),
      this.bundleRepository.countByStatus(
        context.businessId,
        BUNDLE_STATUS_CODES.DRAFT
      ),
      this.bundleRepository.countByStatus(
        context.businessId,
        BUNDLE_STATUS_CODES.ARCHIVED
      ),
    ]);

    const bundles = await Promise.all(
      rows.map((row) => this.mapBundleView(context.businessId, row))
    );

    return {
      totalBundles: bundles.length,
      activeBundles: activeCount,
      draftBundles: draftCount,
      archivedBundles: archivedCount,
      recentlyUpdated: bundles.slice(0, 8),
      bundles,
      bundleLabel: resolveBundleLabel(profile.industryCode),
      industryCode: profile.industryCode,
    };
  }

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<BundleRegistrationCataloguesView> {
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    return {
      bundleTypes: bundleTypeOptions(),
      pricingStrategies: Object.values(BUNDLE_PRICING_STRATEGY_CODES).map((code) => ({
        code,
        label: BUNDLE_PRICING_STRATEGY_LABELS[code],
      })),
      availabilityTypes: Object.values(BUNDLE_AVAILABILITY_TYPES).map((code) => ({
        code,
        label: BUNDLE_AVAILABILITY_TYPE_LABELS[code],
      })),
      defaultStatus: resolveDefaultBundleStatus(),
      bundleLabel: resolveBundleLabel(profile.industryCode),
    };
  }

  async searchBundleProducts(
    context: CurrentBusinessContext,
    query?: string
  ): Promise<BundleProductSearchResult[]> {
    const rows = await this.productRepository.listByBusinessId(context.businessId, {
      limit: 100,
      search: query,
      statusCode: PRODUCT_STATUS_CODES.ACTIVE,
    });

    return rows.map((row) => ({
      id: row.id,
      productCode: row.productCode,
      productName: row.productName,
      productTypeCode: row.productTypeCode,
      statusCode: row.statusCode,
    }));
  }

  async getProductBundlesPanel(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductBundlesPanelView> {
    await this.requireProduct(context, productId);
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const rows = await this.bundleRepository.listByProductId(
      context.businessId,
      productId
    );

    const bundles = await Promise.all(
      rows.map((entry) => this.mapBundleView(context.businessId, entry.bundle))
    );

    return {
      productId,
      bundleLabel: resolveBundleLabel(profile.industryCode),
      bundles,
    };
  }

  async createBundle(
    context: CurrentBusinessContext,
    payload: CreateBundlePayload
  ): Promise<BundleWorkspaceView> {
    const parsed = createBundleSchema.parse(payload);
    const code = normalizeBundleCode(parsed.bundleCode);

    const existingCode = await this.bundleRepository.findByCode(
      context.businessId,
      code
    );
    if (existingCode) {
      throw new ProductError(
        "DUPLICATE_BUNDLE_CODE",
        PRODUCT_USER_MESSAGES.DUPLICATE_BUNDLE_CODE,
        409,
        "bundleCode"
      );
    }

    const duplicateKey = findDuplicateBundleItemKeys(parsed.items);
    if (duplicateKey) {
      throw new ProductError(
        "DUPLICATE_BUNDLE_ITEM",
        PRODUCT_USER_MESSAGES.DUPLICATE_BUNDLE_ITEM,
        409,
        "items"
      );
    }

    await this.validateBundleItems(context, parsed.items);

    const bundle = await this.bundleRepository.insert({
      businessId: context.businessId,
      bundleCode: code,
      bundleName: parsed.bundleName.trim(),
      bundleType: parsed.bundleType,
      statusCode: parsed.statusCode ?? resolveDefaultBundleStatus(),
      ownerPartyId: parsed.ownerPartyId ?? null,
      description: parsed.description ?? null,
      effectiveFrom: parsed.effectiveFrom ?? null,
      effectiveTo: parsed.effectiveTo ?? null,
      pricingStrategy: parsed.pricingStrategy ?? BUNDLE_PRICING_STRATEGY_CODES.SUM_OF_ITEMS,
      availabilityType: parsed.availabilityType ?? BUNDLE_AVAILABILITY_TYPES.ACTIVE,
      recordSource: parsed.recordSource ?? "PLATFORM_CREATED",
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.bundleItemRepository.insertMany(
      parsed.items.map((item, index) => ({
        bundleId: bundle.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: String(item.quantity),
        mandatory: item.mandatory ?? true,
        displayOrder: item.displayOrder ?? index,
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      }))
    );

    await this.recordBundleTimeline(context, bundle.id, {
      eventType: BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_CREATED,
      eventCategory: BUNDLE_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
      summary: `Bundle "${bundle.bundleName}" created`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      ownerPartyId: bundle.ownerPartyId,
      productId: parsed.items[0]?.productId ?? bundle.id,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_BUNDLE,
      entityId: bundle.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        bundleCode: bundle.bundleCode,
        bundleName: bundle.bundleName,
        statusCode: bundle.statusCode,
        itemCount: parsed.items.length,
      },
    });

    return this.getWorkspace(context, bundle.id);
  }

  async updateBundle(
    context: CurrentBusinessContext,
    bundleId: string,
    payload: UpdateBundlePayload
  ): Promise<BundleWorkspaceView> {
    const parsed = updateBundleSchema.parse(payload);
    const existing = await this.requireBundle(context, bundleId);

    if (!isBundleEditable(existing.statusCode)) {
      throw new ProductError(
        "ARCHIVED_BUNDLE_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_BUNDLE_IMMUTABLE,
        400
      );
    }

    if (
      parsed.statusCode &&
      !canTransitionBundleStatus(existing.statusCode, parsed.statusCode)
    ) {
      throw new ProductError(
        "INVALID_BUNDLE_STATUS_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_BUNDLE_STATUS_TRANSITION,
        400,
        "statusCode"
      );
    }

    const updated = await this.bundleRepository.update(
      context.businessId,
      bundleId,
      {
        bundleName: parsed.bundleName?.trim(),
        bundleType: parsed.bundleType,
        statusCode: parsed.statusCode,
        ownerPartyId: parsed.ownerPartyId,
        description: parsed.description,
        effectiveFrom: parsed.effectiveFrom,
        effectiveTo: parsed.effectiveTo,
        pricingStrategy: parsed.pricingStrategy,
        availabilityType: parsed.availabilityType,
        updatedBy: context.platformUserId,
      },
      existing.version
    );

    if (!updated) {
      throw new ProductError(
        "PROVIDER_ERROR",
        "Concurrent update detected. Refresh and try again.",
        409
      );
    }

    await this.recordBundleTimeline(context, bundleId, {
      eventType: BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_UPDATED,
      eventCategory: BUNDLE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
      summary: `Bundle "${updated.bundleName}" updated`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      ownerPartyId: updated.ownerPartyId,
      productId: bundleId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_BUNDLE,
      entityId: bundleId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: existing,
      after: updated,
      trackFields: [
        "bundleName",
        "bundleType",
        "statusCode",
        "ownerPartyId",
        "description",
        "pricingStrategy",
        "availabilityType",
      ],
    });

    return this.getWorkspace(context, bundleId);
  }

  async addBundleItem(
    context: CurrentBusinessContext,
    bundleId: string,
    payload: AddBundleItemPayload
  ): Promise<BundleWorkspaceView> {
    const parsed = addBundleItemSchema.parse(payload);
    const bundle = await this.requireBundle(context, bundleId);

    if (!isBundleEditable(bundle.statusCode)) {
      throw new ProductError(
        "ARCHIVED_BUNDLE_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_BUNDLE_IMMUTABLE,
        400
      );
    }

    await this.validateBundleItems(context, [parsed]);

    const duplicate = await this.bundleItemRepository.findDuplicate(
      bundleId,
      parsed.productId,
      parsed.variantId
    );
    if (duplicate) {
      throw new ProductError(
        "DUPLICATE_BUNDLE_ITEM",
        PRODUCT_USER_MESSAGES.DUPLICATE_BUNDLE_ITEM,
        409,
        "productId"
      );
    }

    const items = await this.bundleItemRepository.listByBundleId(bundleId);
    const item = await this.bundleItemRepository.insert({
      bundleId,
      productId: parsed.productId,
      variantId: parsed.variantId ?? null,
      quantity: String(parsed.quantity),
      mandatory: parsed.mandatory ?? true,
      displayOrder: parsed.displayOrder ?? items.length,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    const product = await this.requireProduct(context, parsed.productId);

    await this.recordBundleTimeline(context, bundleId, {
      eventType: BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_ITEM_ADDED,
      eventCategory: BUNDLE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
      summary: `Added ${product.productName} to bundle`,
      referenceEntity: "product_bundle_item",
      referenceId: item.id,
    });

    await this.recordProductBundleTimeline(context, product.id, {
      eventType: PRODUCT_TIMELINE_EVENT_TYPES.BUNDLE_ITEM_ADDED,
      summary: `Added to bundle "${bundle.bundleName}"`,
      referenceEntity: "product_bundle",
      referenceId: bundleId,
    });

    return this.getWorkspace(context, bundleId);
  }

  async updateBundleItem(
    context: CurrentBusinessContext,
    bundleId: string,
    itemId: string,
    payload: UpdateBundleItemPayload
  ): Promise<BundleWorkspaceView> {
    const parsed = updateBundleItemSchema.parse(payload);
    const bundle = await this.requireBundle(context, bundleId);

    if (!isBundleEditable(bundle.statusCode)) {
      throw new ProductError(
        "ARCHIVED_BUNDLE_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_BUNDLE_IMMUTABLE,
        400
      );
    }

    const existing = await this.bundleItemRepository.findById(bundleId, itemId);
    if (!existing) {
      throw new ProductError(
        "BUNDLE_NOT_FOUND",
        "Bundle item not found.",
        404
      );
    }

    const updated = await this.bundleItemRepository.update(
      bundleId,
      itemId,
      {
        quantity: parsed.quantity !== undefined ? String(parsed.quantity) : undefined,
        mandatory: parsed.mandatory,
        displayOrder: parsed.displayOrder,
        updatedBy: context.platformUserId,
      },
      existing.version
    );

    if (!updated) {
      throw new ProductError(
        "PROVIDER_ERROR",
        "Concurrent update detected. Refresh and try again.",
        409
      );
    }

    const eventType =
      parsed.quantity !== undefined
        ? BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_ITEM_QUANTITY_CHANGED
        : BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_UPDATED;

    await this.recordBundleTimeline(context, bundleId, {
      eventType,
      eventCategory: BUNDLE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
      summary: `Updated bundle item quantity/configuration`,
      referenceEntity: "product_bundle_item",
      referenceId: itemId,
    });

    return this.getWorkspace(context, bundleId);
  }

  async removeBundleItem(
    context: CurrentBusinessContext,
    bundleId: string,
    itemId: string
  ): Promise<BundleWorkspaceView> {
    const bundle = await this.requireBundle(context, bundleId);

    if (!isBundleEditable(bundle.statusCode)) {
      throw new ProductError(
        "ARCHIVED_BUNDLE_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_BUNDLE_IMMUTABLE,
        400
      );
    }

    const items = await this.bundleItemRepository.listByBundleId(bundleId);
    if (items.length <= 1) {
      throw new ProductError(
        "BUNDLE_REQUIRES_ITEMS",
        PRODUCT_USER_MESSAGES.BUNDLE_REQUIRES_ITEMS,
        400
      );
    }

    const existing = await this.bundleItemRepository.findById(bundleId, itemId);
    if (!existing) {
      throw new ProductError("BUNDLE_NOT_FOUND", "Bundle item not found.", 404);
    }

    await this.bundleItemRepository.softDelete(
      bundleId,
      itemId,
      context.platformUserId
    );

    await this.recordBundleTimeline(context, bundleId, {
      eventType: BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_ITEM_REMOVED,
      eventCategory: BUNDLE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
      summary: `Removed item from bundle`,
      referenceEntity: "product_bundle_item",
      referenceId: itemId,
    });

    return this.getWorkspace(context, bundleId);
  }

  async activateBundle(
    context: CurrentBusinessContext,
    bundleId: string
  ): Promise<BundleWorkspaceView> {
    return this.transitionStatus(
      context,
      bundleId,
      BUNDLE_STATUS_CODES.ACTIVE,
      BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_ACTIVATED,
      AUDIT_OPERATIONS.ACTIVATE
    );
  }

  async suspendBundle(
    context: CurrentBusinessContext,
    bundleId: string
  ): Promise<BundleWorkspaceView> {
    return this.transitionStatus(
      context,
      bundleId,
      BUNDLE_STATUS_CODES.SUSPENDED,
      BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_SUSPENDED,
      AUDIT_OPERATIONS.DEACTIVATE
    );
  }

  async archiveBundle(
    context: CurrentBusinessContext,
    bundleId: string
  ): Promise<BundleWorkspaceView> {
    return this.transitionStatus(
      context,
      bundleId,
      BUNDLE_STATUS_CODES.ARCHIVED,
      BUNDLE_TIMELINE_EVENT_TYPES.BUNDLE_ARCHIVED,
      AUDIT_OPERATIONS.ARCHIVE
    );
  }

  async searchBundles(
    context: CurrentBusinessContext,
    payload: SearchBundlesPayload
  ): Promise<ProductBundleView[]> {
    const parsed = searchBundlesSchema.parse(payload);
    const rows = await this.bundleRepository.search(context.businessId, parsed);
    return Promise.all(
      rows.map((row) => this.mapBundleView(context.businessId, row))
    );
  }

  async getWorkspace(
    context: CurrentBusinessContext,
    bundleId: string
  ): Promise<BundleWorkspaceView> {
    const bundle = await this.requireBundle(context, bundleId);
    const [items, timeline, audit] = await Promise.all([
      this.loadItemViews(context.businessId, bundleId),
      this.bundleTimelineService.getTimelinePanel(context.businessId, bundleId),
      this.auditQueryService.getAuditPanel(context, bundleId),
    ]);

    return {
      bundle: await this.mapBundleView(context.businessId, bundle, items.length),
      items,
      timeline,
      audit,
    };
  }

  private async transitionStatus(
    context: CurrentBusinessContext,
    bundleId: string,
    nextStatus: string,
    timelineEventType: string,
    auditOperation: string
  ): Promise<BundleWorkspaceView> {
    const existing = await this.requireBundle(context, bundleId);

    if (!canTransitionBundleStatus(existing.statusCode, nextStatus)) {
      throw new ProductError(
        "INVALID_BUNDLE_STATUS_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_BUNDLE_STATUS_TRANSITION,
        400
      );
    }

    const updated = await this.bundleRepository.update(
      context.businessId,
      bundleId,
      { statusCode: nextStatus, updatedBy: context.platformUserId },
      existing.version
    );

    if (!updated) {
      throw new ProductError(
        "PROVIDER_ERROR",
        "Concurrent update detected. Refresh and try again.",
        409
      );
    }

    await this.recordBundleTimeline(context, bundleId, {
      eventType: timelineEventType,
      eventCategory: BUNDLE_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
      summary: `Status changed to ${bundleStatusLabel(nextStatus)}`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      ownerPartyId: updated.ownerPartyId,
      productId: bundleId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_BUNDLE,
      entityId: bundleId,
      operation: auditOperation,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: { statusCode: existing.statusCode },
      after: { statusCode: nextStatus },
    });

    return this.getWorkspace(context, bundleId);
  }

  private async validateBundleItems(
    context: CurrentBusinessContext,
    items: BundleItemInput[]
  ) {
    for (const item of items) {
      const product = await this.requireProduct(context, item.productId);

      if (product.statusCode === PRODUCT_STATUS_CODES.ARCHIVED) {
        throw new ProductError(
          "ARCHIVED_PRODUCT_NOT_BUNDLEABLE",
          PRODUCT_USER_MESSAGES.ARCHIVED_PRODUCT_NOT_BUNDLEABLE,
          400,
          "productId"
        );
      }

      if (!isProductBundleable(product.statusCode)) {
        throw new ProductError(
          "INACTIVE_PRODUCT_NOT_BUNDLEABLE",
          PRODUCT_USER_MESSAGES.INACTIVE_PRODUCT_NOT_BUNDLEABLE,
          400,
          "productId"
        );
      }

      if (item.variantId) {
        const variant = await this.variantRepository.findById(
          context.businessId,
          item.variantId
        );
        if (!variant || variant.productId !== item.productId) {
          throw new ProductError(
            "INVALID_BUNDLE_ITEM_VARIANT",
            PRODUCT_USER_MESSAGES.INVALID_BUNDLE_ITEM_VARIANT,
            400,
            "variantId"
          );
        }
        if (variant.status === VARIANT_STATUS_CODES.ARCHIVED) {
          throw new ProductError(
            "ARCHIVED_PRODUCT_NOT_BUNDLEABLE",
            PRODUCT_USER_MESSAGES.ARCHIVED_PRODUCT_NOT_BUNDLEABLE,
            400,
            "variantId"
          );
        }
      }
    }
  }

  private async requireBundle(
    context: CurrentBusinessContext,
    bundleId: string
  ): Promise<BundleRow> {
    const row = await this.bundleRepository.findById(context.businessId, bundleId);
    if (!row) {
      throw new ProductError(
        "BUNDLE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.BUNDLE_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async requireProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductRow> {
    const row = await this.productRepository.findById(context.businessId, productId);
    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async loadItemViews(
    businessId: string,
    bundleId: string
  ): Promise<ProductBundleItemView[]> {
    const rows = await this.bundleItemRepository.listDetailedByBundleId(
      businessId,
      bundleId
    );

    return rows.map((row) => ({
      id: row.item.id,
      bundleId: row.item.bundleId,
      productId: row.item.productId,
      productCode: row.productCode,
      productName: row.productName,
      variantId: row.item.variantId,
      variantCode: row.variantCode,
      variantName: row.variantName,
      quantity: Number(row.item.quantity),
      mandatory: row.item.mandatory,
      displayOrder: row.item.displayOrder,
      version: row.item.version,
    }));
  }

  private async mapBundleView(
    businessId: string,
    row: BundleRow,
    itemCountOverride?: number
  ): Promise<ProductBundleView> {
    const itemCount =
      itemCountOverride ??
      (await this.bundleItemRepository.listByBundleId(row.id)).length;

    return {
      id: row.id,
      bundleCode: row.bundleCode,
      bundleName: row.bundleName,
      bundleType: row.bundleType,
      bundleTypeLabel: bundleTypeLabel(row.bundleType),
      statusCode: row.statusCode,
      statusLabel: bundleStatusLabel(row.statusCode),
      ownerPartyId: row.ownerPartyId,
      description: row.description,
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      pricingStrategy: row.pricingStrategy,
      pricingStrategyLabel:
        BUNDLE_PRICING_STRATEGY_LABELS[
          row.pricingStrategy as keyof typeof BUNDLE_PRICING_STRATEGY_LABELS
        ] ?? row.pricingStrategy,
      availabilityType: row.availabilityType,
      availabilityTypeLabel:
        BUNDLE_AVAILABILITY_TYPE_LABELS[
          row.availabilityType as keyof typeof BUNDLE_AVAILABILITY_TYPE_LABELS
        ] ?? row.availabilityType,
      itemCount,
      recordSource: row.recordSource,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
    };
  }

  private async recordBundleTimeline(
    context: CurrentBusinessContext,
    bundleId: string,
    input: {
      eventType: string;
      eventCategory: string;
      summary: string;
      referenceEntity?: string;
      referenceId?: string;
    }
  ) {
    await this.bundleTimelineService.recordEvent(
      buildBundleTimelineEventFromContext(context, {
        bundleId,
        eventType: input.eventType,
        eventCategory: input.eventCategory,
        sourceModule: BUNDLE_TIMELINE_SOURCE_MODULES.PRODUCT_BUNDLES,
        summary: input.summary,
        referenceEntity: input.referenceEntity,
        referenceId: input.referenceId,
      })
    );
  }

  private async recordProductBundleTimeline(
    context: CurrentBusinessContext,
    productId: string,
    input: {
      eventType: string;
      summary: string;
      referenceEntity?: string;
      referenceId?: string;
    }
  ) {
    await this.productTimelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: input.eventType,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: input.summary,
        referenceEntity: input.referenceEntity,
        referenceId: input.referenceId,
      })
    );
  }
}

export function createProductBundleService() {
  return new ProductBundleService();
}
