/**
 * Purpose:
 * Offering Pricing orchestration — catalogues, price items, lifecycle, audit, timeline.
 *
 * Architecture:
 * Server Actions → PricingService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
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
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import { DEFAULT_OFFERING_WORKSPACE_LABEL } from "@/core/industry-experience/offering-terminology";
import { getDb } from "@/db/client";
import { seedPricingMethods } from "@/db/seeds/pricing-methods-seed";
import {
  PRICING_ITEM_STATUS_CODES,
  type PricingItemStatusCode,
  type ProductStatusCode,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createPricingCatalogueRepository } from "@/modules/product/repositories/pricing-catalogue-repository";
import { createPricingItemRepository } from "@/modules/product/repositories/pricing-item-repository";
import type { PricingItemRowWithRelations } from "@/modules/product/repositories/pricing-item-repository";
import { createPricingMethodRepository } from "@/modules/product/repositories/pricing-method-repository";
import { createProductReferenceRepository } from "@/modules/product/repositories/product-reference-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import { isProductEditable } from "@/modules/product/services/product-rules";
import {
  buildPricingDimensionKey,
  canTransitionPricingItemStatus,
  dimensionKeysMatch,
  formatPriceAmount,
  isEffectivePeriodValid,
  isPricingItemActiveNow,
  isPricingItemEditable,
  isPricingItemExpired,
  isPricingItemFuture,
  isValidPriceRange,
  normalizePricingCode,
  normalizePricingDimension,
  periodsOverlap,
  pricingCatalogueStatusLabel,
  pricingItemStatusLabel,
  resolveDefaultPricingCatalogueStatus,
  resolveDefaultPricingItemStatus,
} from "@/modules/product/services/pricing-rules";
import type {
  ComparePricingItemsPayload,
  CreatePricingCataloguePayload,
  CreatePricingItemPayload,
  PricingCatalogueView,
  PricingComparisonView,
  PricingDashboardView,
  PricingItemView,
  PricingRegistrationCataloguesView,
  ProductPricingPanelView,
  SearchPricingItemsPayload,
  UpdatePricingCataloguePayload,
  UpdatePricingItemPayload,
} from "@/modules/product/types";
import {
  comparePricingItemsSchema,
  createPricingCatalogueSchema,
  createPricingItemSchema,
  searchPricingItemsSchema,
  updatePricingCatalogueSchema,
  updatePricingItemSchema,
} from "@/modules/product/validators/pricing-validators";

type PricingItemRow = PricingItemRowWithRelations["item"];

export class PricingService {
  constructor(
    private readonly catalogueRepository = createPricingCatalogueRepository(),
    private readonly itemRepository = createPricingItemRepository(),
    private readonly methodRepository = createPricingMethodRepository(),
    private readonly productRepository = createProductRepository(),
    private readonly referenceRepository = createProductReferenceRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async ensureReferenceData(): Promise<void> {
    await seedPricingMethods(getDb());
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<PricingDashboardView> {
    await this.ensureReferenceData();

    const profile =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );

    const [catalogues, recentlyUpdated, pricingMethods, currencies] =
      await Promise.all([
        this.catalogueRepository.listByBusinessId(context.businessId),
        this.itemRepository.listRecentlyUpdated(context.businessId),
        this.methodRepository.listActive(),
        this.referenceRepository.listActiveCurrencies(),
      ]);

    const activeCatalogues = await this.catalogueRepository.countActive(
      context.businessId
    );

    const now = new Date();
    const mappedRecent = await Promise.all(
      recentlyUpdated.map((row) => this.mapItemView(row, now))
    );

    const allItems = await this.itemRepository.search(context.businessId, {});
    const views = await Promise.all(
      allItems.map((row) => this.mapItemView(row, now))
    );

    return {
      activePrices: views.filter((item) => item.isActiveNow).length,
      futurePrices: views.filter((item) => item.isFuture).length,
      expiredPrices: views.filter((item) => item.isExpired).length,
      catalogueCount: catalogues.length,
      activeCatalogues,
      recentlyUpdated: mappedRecent,
      catalogues: catalogues.map((row) => this.mapCatalogueView(row)),
      pricingMethods,
      currencies,
      catalogueLabel: profile.offeringWorkspaceLabel ?? DEFAULT_OFFERING_WORKSPACE_LABEL,
    };
  }

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<PricingRegistrationCataloguesView> {
    await this.ensureReferenceData();

    const [catalogues, pricingMethods, currencies] = await Promise.all([
      this.catalogueRepository.listByBusinessId(context.businessId),
      this.methodRepository.listActive(),
      this.referenceRepository.listActiveCurrencies(),
    ]);

    return {
      catalogues: catalogues.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        currencyCode: row.currencyCode,
      })),
      pricingMethods,
      currencies,
    };
  }

  async getProductPricingPanel(
    context: CurrentBusinessContext,
    offeringId: string
  ): Promise<ProductPricingPanelView> {
    await this.ensureReferenceData();
    await this.requireOffering(context, offeringId);

    const [rows, catalogues, pricingMethods, currencies] = await Promise.all([
      this.itemRepository.listByOfferingId(context.businessId, offeringId),
      this.catalogueRepository.listByBusinessId(context.businessId),
      this.methodRepository.listActive(),
      this.referenceRepository.listActiveCurrencies(),
    ]);

    const now = new Date();
    const views = await Promise.all(
      rows.map(async (row) => this.mapItemView(row, now))
    );

    const activePrices = views.filter((item) => item.isActiveNow);
    const futurePrices = views.filter((item) => item.isFuture);
    const expiredPrices = views.filter((item) => item.isExpired);
    const priceHistory = views
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

    return {
      offeringId,
      activePrices,
      futurePrices,
      expiredPrices,
      priceHistory,
      catalogues: catalogues.map((row) => this.mapCatalogueView(row)),
      pricingMethods,
      currencies,
      counts: {
        active: activePrices.length,
        future: futurePrices.length,
        expired: expiredPrices.length,
        total: views.length,
      },
    };
  }

  async createCatalogue(
    context: CurrentBusinessContext,
    payload: CreatePricingCataloguePayload
  ): Promise<PricingCatalogueView> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.ensureReferenceData();
    const parsed = createPricingCatalogueSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0]?.toString()
      );
    }

    const code = normalizePricingCode(parsed.data.code);
    const existing = await this.catalogueRepository.findByCode(
      context.businessId,
      code
    );
    if (existing) {
      throw new ProductError(
        "DUPLICATE_PRICING_CATALOGUE_CODE",
        msg.DUPLICATE_PRICING_CATALOGUE_CODE,
        409,
        "code"
      );
    }

    const currencyValid = await this.referenceRepository.listActiveCurrencies();
    if (!currencyValid.some((row) => row.code === parsed.data.currencyCode)) {
      throw new ProductError(
        "INVALID_INPUT",
        "Selected currency is not valid.",
        400,
        "currencyCode"
      );
    }

    const row = await this.catalogueRepository.insert({
      businessId: context.businessId,
      code,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      currencyCode: parsed.data.currencyCode.trim().toUpperCase(),
      status: resolveDefaultPricingCatalogueStatus(),
      effectiveFrom: parsed.data.effectiveFrom
        ? new Date(parsed.data.effectiveFrom)
        : null,
      effectiveTo: parsed.data.effectiveTo
        ? new Date(parsed.data.effectiveTo)
        : null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: row.id,
      entityName: AUDIT_ENTITY_NAMES.PRICING_CATALOGUE,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        code: row.code,
        name: row.name,
        currencyCode: row.currencyCode,
        status: row.status,
      },
    });

    return this.mapCatalogueView(row);
  }

  async updateCatalogue(
    context: CurrentBusinessContext,
    catalogueId: string,
    payload: UpdatePricingCataloguePayload
  ): Promise<PricingCatalogueView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = updatePricingCatalogueSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0]?.toString()
      );
    }

    const existing = await this.requireCatalogue(context, catalogueId);
    const before = this.catalogueAuditSnapshot(existing);

    const row = await this.catalogueRepository.updateById(
      context.businessId,
      catalogueId,
      {
        name: parsed.data.name?.trim(),
        description:
          parsed.data.description === undefined
            ? undefined
            : parsed.data.description?.trim() || null,
        currencyCode: parsed.data.currencyCode?.trim().toUpperCase(),
        effectiveFrom:
          parsed.data.effectiveFrom === undefined
            ? undefined
            : parsed.data.effectiveFrom
              ? new Date(parsed.data.effectiveFrom)
              : null,
        effectiveTo:
          parsed.data.effectiveTo === undefined
            ? undefined
            : parsed.data.effectiveTo
              ? new Date(parsed.data.effectiveTo)
              : null,
        updatedBy: context.platformUserId,
      }
    );

    if (!row) {
      throw new ProductError(
        "PRICING_CATALOGUE_NOT_FOUND",
        msg.PRICING_CATALOGUE_NOT_FOUND,
        404
      );
    }

    await recordProductEntityAudit(this.auditService, context, {
      productId: row.id,
      entityName: AUDIT_ENTITY_NAMES.PRICING_CATALOGUE,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before,
      after: this.catalogueAuditSnapshot(row),
      trackFields: ["name", "description", "currencyCode", "status"],
    });

    return this.mapCatalogueView(row);
  }

  async createPriceItem(
    context: CurrentBusinessContext,
    payload: CreatePricingItemPayload
  ): Promise<PricingItemView> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.ensureReferenceData();
    const parsed = createPricingItemSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0]?.toString()
      );
    }

    const offering = await this.requireEditableOffering(
      context,
      parsed.data.offeringId
    );
    await this.requireCatalogue(
      context,
      parsed.data.pricingCatalogueId
    );

    const methodValid = await this.methodRepository.isActiveCode(
      parsed.data.pricingMethod
    );
    if (!methodValid) {
      throw new ProductError(
        "INVALID_PRICING_METHOD",
        msg.INVALID_PRICING_METHOD,
        400,
        "pricingMethod"
      );
    }

    const effectiveFrom = new Date(parsed.data.effectiveFrom);
    const effectiveTo = parsed.data.effectiveTo
      ? new Date(parsed.data.effectiveTo)
      : null;

    if (!isEffectivePeriodValid(effectiveFrom, effectiveTo)) {
      throw new ProductError(
        "INVALID_EFFECTIVE_PERIOD",
        msg.INVALID_EFFECTIVE_PERIOD,
        400,
        "effectiveTo"
      );
    }

    if (
      !isValidPriceRange(
        parsed.data.unitPrice,
        parsed.data.minimumPrice,
        parsed.data.maximumPrice
      )
    ) {
      throw new ProductError(
        "INVALID_PRICE_RANGE",
        msg.INVALID_PRICE_RANGE,
        400,
        "unitPrice"
      );
    }

    const row = await this.itemRepository.insert({
      businessId: context.businessId,
      offeringId: parsed.data.offeringId,
      pricingCatalogueId: parsed.data.pricingCatalogueId,
      currencyCode: parsed.data.currencyCode.trim().toUpperCase(),
      unitPrice: String(parsed.data.unitPrice),
      minimumPrice:
        parsed.data.minimumPrice != null
          ? String(parsed.data.minimumPrice)
          : null,
      maximumPrice:
        parsed.data.maximumPrice != null
          ? String(parsed.data.maximumPrice)
          : null,
      pricingMethod: parsed.data.pricingMethod,
      customerSegment: normalizePricingDimension(parsed.data.customerSegment),
      salesChannel: normalizePricingDimension(parsed.data.salesChannel),
      region: normalizePricingDimension(parsed.data.region),
      effectiveFrom,
      effectiveTo,
      status: resolveDefaultPricingItemStatus(),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.recordPriceTimeline(context, offering.id, {
      eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRICE_CREATED,
      summary: `Price created — ${formatPriceAmount(row.unitPrice)} ${row.currencyCode}`,
      referenceEntity: AUDIT_ENTITY_NAMES.PRICING_ITEM,
      referenceId: row.id,
      metadata: { pricingItemId: row.id, status: row.status },
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: offering.id,
      ownerPartyId: offering.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRICING_ITEM,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: this.itemAuditSnapshot(row),
      metadata: { offeringId: offering.id },
    });

    const withRelations = await this.itemRepository.findByIdWithRelations(
      context.businessId,
      row.id
    );

    return this.mapItemView(withRelations!, new Date());
  }

  async updatePriceItem(
    context: CurrentBusinessContext,
    itemId: string,
    payload: UpdatePricingItemPayload
  ): Promise<PricingItemView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = updatePricingItemSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0]?.toString()
      );
    }

    const existing = await this.requirePriceItem(context, itemId);
    const offering = await this.requireEditableOffering(
      context,
      existing.offeringId
    );

    if (!isPricingItemEditable(existing.status as PricingItemStatusCode)) {
      throw new ProductError(
        "EXPIRED_PRICING_IMMUTABLE",
        msg.EXPIRED_PRICING_IMMUTABLE,
        409
      );
    }

    const before = this.itemAuditSnapshot(existing);
    const nextUnitPrice =
      parsed.data.unitPrice ?? Number(existing.unitPrice);
    const nextMinimum =
      parsed.data.minimumPrice === undefined
        ? existing.minimumPrice
          ? Number(existing.minimumPrice)
          : null
        : parsed.data.minimumPrice;
    const nextMaximum =
      parsed.data.maximumPrice === undefined
        ? existing.maximumPrice
          ? Number(existing.maximumPrice)
          : null
        : parsed.data.maximumPrice;

    if (!isValidPriceRange(nextUnitPrice, nextMinimum, nextMaximum)) {
      throw new ProductError(
        "INVALID_PRICE_RANGE",
        msg.INVALID_PRICE_RANGE,
        400,
        "unitPrice"
      );
    }

    if (parsed.data.pricingMethod) {
      const methodValid = await this.methodRepository.isActiveCode(
        parsed.data.pricingMethod
      );
      if (!methodValid) {
        throw new ProductError(
          "INVALID_PRICING_METHOD",
          msg.INVALID_PRICING_METHOD,
          400,
          "pricingMethod"
        );
      }
    }

    const row = await this.itemRepository.updateById(
      context.businessId,
      itemId,
      {
        unitPrice:
          parsed.data.unitPrice != null ? String(parsed.data.unitPrice) : undefined,
        minimumPrice:
          parsed.data.minimumPrice === undefined
            ? undefined
            : parsed.data.minimumPrice != null
              ? String(parsed.data.minimumPrice)
              : null,
        maximumPrice:
          parsed.data.maximumPrice === undefined
            ? undefined
            : parsed.data.maximumPrice != null
              ? String(parsed.data.maximumPrice)
              : null,
        pricingMethod: parsed.data.pricingMethod,
        customerSegment:
          parsed.data.customerSegment === undefined
            ? undefined
            : normalizePricingDimension(parsed.data.customerSegment),
        salesChannel:
          parsed.data.salesChannel === undefined
            ? undefined
            : normalizePricingDimension(parsed.data.salesChannel),
        region:
          parsed.data.region === undefined
            ? undefined
            : normalizePricingDimension(parsed.data.region),
        effectiveFrom: parsed.data.effectiveFrom
          ? new Date(parsed.data.effectiveFrom)
          : undefined,
        effectiveTo:
          parsed.data.effectiveTo === undefined
            ? undefined
            : parsed.data.effectiveTo
              ? new Date(parsed.data.effectiveTo)
              : null,
        updatedBy: context.platformUserId,
      }
    );

    if (!row) {
      throw new ProductError(
        "PRICING_ITEM_NOT_FOUND",
        msg.PRICING_ITEM_NOT_FOUND,
        404
      );
    }

    await this.recordPriceTimeline(context, offering.id, {
      eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRICE_UPDATED,
      summary: `Price updated — ${formatPriceAmount(row.unitPrice)} ${row.currencyCode}`,
      referenceEntity: AUDIT_ENTITY_NAMES.PRICING_ITEM,
      referenceId: row.id,
      metadata: { pricingItemId: row.id },
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: offering.id,
      ownerPartyId: offering.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRICING_ITEM,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before,
      after: this.itemAuditSnapshot(row),
      trackFields: [
        "unitPrice",
        "minimumPrice",
        "maximumPrice",
        "pricingMethod",
        "customerSegment",
        "salesChannel",
        "region",
        "effectiveFrom",
        "effectiveTo",
        "status",
      ],
      metadata: { offeringId: offering.id },
    });

    const withRelations = await this.itemRepository.findByIdWithRelations(
      context.businessId,
      row.id
    );

    return this.mapItemView(withRelations!, new Date());
  }

  async activatePriceItem(
    context: CurrentBusinessContext,
    itemId: string
  ): Promise<PricingItemView> {
    return this.transitionPriceItemStatus(
      context,
      itemId,
      PRICING_ITEM_STATUS_CODES.ACTIVE,
      PRODUCT_TIMELINE_EVENT_TYPES.PRICE_ACTIVATED,
      AUDIT_OPERATIONS.ACTIVATE,
      "Price activated"
    );
  }

  async expirePriceItem(
    context: CurrentBusinessContext,
    itemId: string
  ): Promise<PricingItemView> {
    return this.transitionPriceItemStatus(
      context,
      itemId,
      PRICING_ITEM_STATUS_CODES.EXPIRED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRICE_EXPIRED,
      AUDIT_OPERATIONS.DEACTIVATE,
      "Price expired"
    );
  }

  async archivePriceItem(
    context: CurrentBusinessContext,
    itemId: string
  ): Promise<PricingItemView> {
    return this.transitionPriceItemStatus(
      context,
      itemId,
      PRICING_ITEM_STATUS_CODES.ARCHIVED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRICE_ARCHIVED,
      AUDIT_OPERATIONS.ARCHIVE,
      "Price archived"
    );
  }

  async copyPriceItem(
    context: CurrentBusinessContext,
    itemId: string
  ): Promise<PricingItemView> {
    const existing = await this.requirePriceItem(context, itemId);
    await this.requireEditableOffering(context, existing.offeringId);

    return this.createPriceItem(context, {
      offeringId: existing.offeringId,
      pricingCatalogueId: existing.pricingCatalogueId,
      currencyCode: existing.currencyCode,
      unitPrice: Number(existing.unitPrice),
      minimumPrice: existing.minimumPrice
        ? Number(existing.minimumPrice)
        : null,
      maximumPrice: existing.maximumPrice
        ? Number(existing.maximumPrice)
        : null,
      pricingMethod: existing.pricingMethod,
      customerSegment: existing.customerSegment ?? undefined,
      salesChannel: existing.salesChannel ?? undefined,
      region: existing.region ?? undefined,
      effectiveFrom: new Date().toISOString(),
      effectiveTo: existing.effectiveTo?.toISOString() ?? null,
    });
  }

  async searchPriceItems(
    context: CurrentBusinessContext,
    payload: SearchPricingItemsPayload
  ): Promise<PricingItemView[]> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.ensureReferenceData();
    const parsed = searchPricingItemsSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const rows = await this.itemRepository.search(context.businessId, {
      query: parsed.data.query || undefined,
      offeringId: parsed.data.offeringId || undefined,
      pricingCatalogueId: parsed.data.pricingCatalogueId || undefined,
      currencyCode: parsed.data.currencyCode || undefined,
      customerSegment: parsed.data.customerSegment || undefined,
      salesChannel: parsed.data.salesChannel || undefined,
      region: parsed.data.region || undefined,
      status: parsed.data.status,
    });

    const now = new Date();
    return Promise.all(rows.map((row) => this.mapItemView(row, now)));
  }

  async comparePriceItems(
    context: CurrentBusinessContext,
    payload: ComparePricingItemsPayload
  ): Promise<PricingComparisonView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = comparePricingItemsSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const now = new Date();
    const items: PricingItemView[] = [];

    for (const itemId of parsed.data.itemIds) {
      const row = await this.itemRepository.findByIdWithRelations(
        context.businessId,
        itemId
      );
      if (!row) {
        throw new ProductError(
          "PRICING_ITEM_NOT_FOUND",
          msg.PRICING_ITEM_NOT_FOUND,
          404
        );
      }
      items.push(await this.mapItemView(row, now));
    }

    const dimensionSummary = [
      ...new Set(
        items.flatMap((item) => [
          item.catalogueName,
          item.currencyCode,
          item.customerSegment ?? "All segments",
          item.salesChannel ?? "All channels",
          item.region ?? "All regions",
        ])
      ),
    ];

    return { items, dimensionSummary };
  }

  private async transitionPriceItemStatus(
    context: CurrentBusinessContext,
    itemId: string,
    nextStatus: PricingItemStatusCode,
    timelineEventType: string,
    auditOperation: string,
    summaryPrefix: string
  ): Promise<PricingItemView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const existing = await this.requirePriceItem(context, itemId);
    const offering = await this.requireEditableOffering(
      context,
      existing.offeringId
    );

    const currentStatus = existing.status as PricingItemStatusCode;
    if (!canTransitionPricingItemStatus(currentStatus, nextStatus)) {
      throw new ProductError(
        "INVALID_PRICING_STATUS_TRANSITION",
        msg.INVALID_PRICING_STATUS_TRANSITION,
        409
      );
    }

    if (nextStatus === PRICING_ITEM_STATUS_CODES.ACTIVE) {
      await this.assertNoDuplicateActivePrice(context, existing, itemId);
    }

    const before = this.itemAuditSnapshot(existing);
    const row = await this.itemRepository.updateById(
      context.businessId,
      itemId,
      {
        status: nextStatus,
        updatedBy: context.platformUserId,
      }
    );

    if (!row) {
      throw new ProductError(
        "PRICING_ITEM_NOT_FOUND",
        msg.PRICING_ITEM_NOT_FOUND,
        404
      );
    }

    await this.recordPriceTimeline(context, offering.id, {
      eventType: timelineEventType,
      summary: `${summaryPrefix} — ${formatPriceAmount(row.unitPrice)} ${row.currencyCode}`,
      referenceEntity: AUDIT_ENTITY_NAMES.PRICING_ITEM,
      referenceId: row.id,
      metadata: { pricingItemId: row.id, status: row.status },
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: offering.id,
      ownerPartyId: offering.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRICING_ITEM,
      entityId: row.id,
      operation: auditOperation,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before,
      after: this.itemAuditSnapshot(row),
      trackFields: ["status"],
      metadata: { offeringId: offering.id },
    });

    const withRelations = await this.itemRepository.findByIdWithRelations(
      context.businessId,
      itemId
    );

    return this.mapItemView(withRelations!, new Date());
  }

  private async assertNoDuplicateActivePrice(
    context: CurrentBusinessContext,
    candidate: PricingItemRow,
    excludeItemId?: string
  ): Promise<void> {
    const msg = await resolveProductUserMessagesForContext(context);
    const key = buildPricingDimensionKey({
      offeringId: candidate.offeringId,
      pricingCatalogueId: candidate.pricingCatalogueId,
      currencyCode: candidate.currencyCode,
      customerSegment: candidate.customerSegment,
      salesChannel: candidate.salesChannel,
      region: candidate.region,
      effectiveFrom: candidate.effectiveFrom,
      effectiveTo: candidate.effectiveTo,
    });

    const activeItems = await this.itemRepository.listActiveCandidates(
      context.businessId,
      candidate.offeringId
    );

    for (const item of activeItems) {
      if (excludeItemId && item.id === excludeItemId) {
        continue;
      }

      const itemKey = buildPricingDimensionKey({
        offeringId: item.offeringId,
        pricingCatalogueId: item.pricingCatalogueId,
        currencyCode: item.currencyCode,
        customerSegment: item.customerSegment,
        salesChannel: item.salesChannel,
        region: item.region,
        effectiveFrom: item.effectiveFrom,
        effectiveTo: item.effectiveTo,
      });

      if (
        dimensionKeysMatch(key, itemKey) &&
        periodsOverlap(
          key.effectiveFrom,
          key.effectiveTo,
          itemKey.effectiveFrom,
          itemKey.effectiveTo
        )
      ) {
        throw new ProductError(
          "DUPLICATE_ACTIVE_PRICING",
          msg.DUPLICATE_ACTIVE_PRICING,
          409
        );
      }
    }
  }

  private async requireOffering(
    context: CurrentBusinessContext,
    offeringId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const row = await this.productRepository.findById(context.businessId, offeringId);
    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        msg.PRODUCT_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async requireEditableOffering(
    context: CurrentBusinessContext,
    offeringId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const row = await this.requireOffering(context, offeringId);
    if (!isProductEditable(row.statusCode as ProductStatusCode)) {
      throw new ProductError(
        "ARCHIVED_PRODUCT_IMMUTABLE",
        msg.ARCHIVED_PRODUCT_IMMUTABLE,
        409
      );
    }
    return row;
  }

  private async requireCatalogue(
    context: CurrentBusinessContext,
    catalogueId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const row = await this.catalogueRepository.findById(context.businessId, catalogueId);
    if (!row) {
      throw new ProductError(
        "PRICING_CATALOGUE_NOT_FOUND",
        msg.PRICING_CATALOGUE_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async requirePriceItem(
    context: CurrentBusinessContext,
    itemId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const row = await this.itemRepository.findById(context.businessId, itemId);
    if (!row) {
      throw new ProductError(
        "PRICING_ITEM_NOT_FOUND",
        msg.PRICING_ITEM_NOT_FOUND,
        404
      );
    }
    return row;
  }

  private async recordPriceTimeline(
    context: CurrentBusinessContext,
    productId: string,
    input: {
      eventType: string;
      summary: string;
      referenceEntity?: string;
      referenceId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: input.eventType,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: input.summary,
        referenceEntity: input.referenceEntity,
        referenceId: input.referenceId,
        metadata: input.metadata,
      })
    );
  }

  private mapCatalogueView(
    row: Awaited<
      ReturnType<PricingCatalogueRepository["listByBusinessId"]>
    >[number]
  ): PricingCatalogueView {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      currencyCode: row.currencyCode,
      status: row.status,
      statusLabel: pricingCatalogueStatusLabel(row.status),
      effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
      effectiveTo: row.effectiveTo?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async mapItemView(
    row: PricingItemRowWithRelations,
    now: Date
  ): Promise<PricingItemView> {
    const item = row.item;
    const methodLabel = await this.methodRepository.getName(item.pricingMethod);
    const status = item.status as PricingItemStatusCode;

    return {
      id: item.id,
      offeringId: item.offeringId,
      offeringCode: row.offeringCode,
      offeringName: row.offeringName,
      pricingCatalogueId: item.pricingCatalogueId,
      catalogueCode: row.catalogueCode,
      catalogueName: row.catalogueName,
      currencyCode: item.currencyCode,
      unitPrice: item.unitPrice,
      minimumPrice: item.minimumPrice,
      maximumPrice: item.maximumPrice,
      pricingMethod: item.pricingMethod,
      pricingMethodLabel: methodLabel,
      customerSegment: item.customerSegment,
      salesChannel: item.salesChannel,
      region: item.region,
      effectiveFrom: item.effectiveFrom.toISOString(),
      effectiveTo: item.effectiveTo?.toISOString() ?? null,
      status: item.status,
      statusLabel: pricingItemStatusLabel(item.status),
      isActiveNow: isPricingItemActiveNow(item, now),
      isFuture: isPricingItemFuture(item, now),
      isExpired: isPricingItemExpired(item, now),
      isEditable: isPricingItemEditable(status),
      updatedAt: item.updatedAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    };
  }

  private catalogueAuditSnapshot(row: {
    code: string;
    name: string;
    description: string | null;
    currencyCode: string;
    status: string;
  }) {
    return {
      code: row.code,
      name: row.name,
      description: row.description,
      currencyCode: row.currencyCode,
      status: row.status,
    };
  }

  private itemAuditSnapshot(row: PricingItemRow) {
    return {
      offeringId: row.offeringId,
      pricingCatalogueId: row.pricingCatalogueId,
      currencyCode: row.currencyCode,
      unitPrice: row.unitPrice,
      minimumPrice: row.minimumPrice,
      maximumPrice: row.maximumPrice,
      pricingMethod: row.pricingMethod,
      customerSegment: row.customerSegment,
      salesChannel: row.salesChannel,
      region: row.region,
      effectiveFrom: row.effectiveFrom.toISOString(),
      effectiveTo: row.effectiveTo?.toISOString() ?? null,
      status: row.status,
    };
  }
}

type PricingCatalogueRepository = ReturnType<
  typeof createPricingCatalogueRepository
>;

export function createPricingService() {
  return new PricingService();
}
