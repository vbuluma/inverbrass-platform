/**
 * Purpose:
 * Product Foundation orchestration — create, update, lifecycle, search, dashboard.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
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
import { createIndustryExperienceService } from "@/core/industry-experience";
import {
  PRODUCT_DEFAULT_PAGE_SIZE,
  PRODUCT_RECORD_SOURCE_CODES,
  PRODUCT_STATUS_CODES,
  type ProductStatusCode,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductReferenceRepository } from "@/modules/product/repositories/product-reference-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { createProductVariantService } from "@/modules/product/services/product-variant-service";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  canTransitionProductStatus,
  isProductEditable,
  isProductRecordSourceCode,
  isProductStatusCode,
  normalizeProductCode,
  recordSourceLabel,
  resolveDefaultProductStatus,
} from "@/modules/product/services/product-rules";
import type {
  CreateProductPayload,
  ProductDashboardView,
  ProductDetailView,
  ProductListFilters,
  ProductListView,
  ProductRegistrationCatalogues,
  ProductSummaryView,
  UpdateProductPayload,
} from "@/modules/product/types";
import {
  createProductSchema,
  productListFiltersSchema,
  productSearchQuerySchema,
  updateProductSchema,
} from "@/modules/product/validators/product-validators";

type ProductRow = NonNullable<
  Awaited<ReturnType<ReturnType<typeof createProductRepository>["findById"]>>
>;

export class ProductService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly referenceRepository = createProductReferenceRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<ProductRegistrationCatalogues> {
    const industryContext =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );

    const [allProductTypes, productStatuses, currencies, ownerParties] =
      await Promise.all([
        this.referenceRepository.listActiveProductTypes(),
        this.referenceRepository.listActiveProductStatuses(),
        this.referenceRepository.listActiveCurrencies(),
        this.referenceRepository.listOwnerPartyOptions(context.businessId),
      ]);

    const productTypes =
      await this.industryExperienceService.filterProductTypesForBusiness(
        context.businessId,
        allProductTypes
      );

    if (productTypes.length === 0 || productStatuses.length === 0) {
      throw new ProductError(
        "REFERENCE_DATA_MISSING",
        PRODUCT_USER_MESSAGES.REFERENCE_DATA_MISSING,
        503
      );
    }

    return {
      productTypes,
      productStatuses,
      currencies,
      ownerParties,
      catalogueLabel: industryContext.offeringCatalogueNavLabel,
      industryCode: industryContext.industryCode,
      industryName: industryContext.industryName,
      recordSources: [
        {
          code: PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED,
          name: "Platform Created",
        },
        {
          code: PRODUCT_RECORD_SOURCE_CODES.MIGRATED,
          name: "Migrated",
        },
        {
          code: PRODUCT_RECORD_SOURCE_CODES.API,
          name: "API",
        },
      ],
    };
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<ProductDashboardView> {
    const industryContext =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );

    const [
      totalProducts,
      activeProducts,
      draftProducts,
      discontinuedProducts,
      suspendedProducts,
      archivedProducts,
      recentRows,
      statusGroups,
      typeGroups,
      statuses,
      types,
    ] = await Promise.all([
      this.productRepository.countByBusinessId(context.businessId),
      this.productRepository.countByStatus(
        context.businessId,
        PRODUCT_STATUS_CODES.ACTIVE
      ),
      this.productRepository.countByStatus(
        context.businessId,
        PRODUCT_STATUS_CODES.DRAFT
      ),
      this.productRepository.countByStatus(
        context.businessId,
        PRODUCT_STATUS_CODES.DISCONTINUED
      ),
      this.productRepository.countByStatus(
        context.businessId,
        PRODUCT_STATUS_CODES.SUSPENDED
      ),
      this.productRepository.countByStatus(
        context.businessId,
        PRODUCT_STATUS_CODES.ARCHIVED
      ),
      this.productRepository.listRecentlyUpdatedByBusinessId(
        context.businessId,
        8
      ),
      this.productRepository.countGroupedByStatus(context.businessId),
      this.productRepository.countGroupedByType(context.businessId),
      this.referenceRepository.listActiveProductStatuses(),
      this.referenceRepository.listActiveProductTypes(),
    ]);

    const statusNameByCode = new Map(statuses.map((s) => [s.code, s.name]));
    const typeNameByCode = new Map(types.map((t) => [t.code, t.name]));

    const recentlyUpdated = await Promise.all(
      recentRows.map((row) => this.toSummaryView(row))
    );

    return {
      totalProducts,
      activeProducts,
      draftProducts,
      discontinuedProducts,
      suspendedProducts,
      archivedProducts,
      recentlyUpdated,
      catalogueLabel: industryContext.offeringCatalogueNavLabel,
      industryCode: industryContext.industryCode,
      industryName: industryContext.industryName,
      statusSummary: statusGroups.map((group) => ({
        statusCode: group.statusCode,
        statusName: statusNameByCode.get(group.statusCode) ?? group.statusCode,
        count: Number(group.value),
      })),
      typeSummary: typeGroups.map((group) => ({
        typeCode: group.productTypeCode,
        typeName:
          typeNameByCode.get(group.productTypeCode) ?? group.productTypeCode,
        count: Number(group.value),
      })),
    };
  }

  async listProducts(
    context: CurrentBusinessContext,
    filters: ProductListFilters = {}
  ): Promise<ProductListView> {
    const parsed = productListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const pageSize = parsed.data.limit ?? PRODUCT_DEFAULT_PAGE_SIZE;
    const offset = parsed.data.offset ?? 0;

    const [rows, totalCount] = await Promise.all([
      this.productRepository.listByBusinessId(context.businessId, {
        ...parsed.data,
        limit: pageSize,
        offset,
      }),
      this.productRepository.countByBusinessId(context.businessId, parsed.data),
    ]);

    const products = await Promise.all(
      rows.map((row) => this.toSummaryView(row))
    );

    return {
      products,
      totalCount,
      hasMore: offset + products.length < totalCount,
      pageSize,
      offset,
    };
  }

  async searchProducts(
    context: CurrentBusinessContext,
    query: string
  ): Promise<ProductSummaryView[]> {
    const parsed = productSearchQuerySchema.safeParse({ query });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const rows = await this.productRepository.listByBusinessId(
      context.businessId,
      { search: parsed.data.query, limit: 20, offset: 0 }
    );

    return Promise.all(rows.map((row) => this.toSummaryView(row)));
  }

  async getProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductDetailView> {
    const row = await this.productRepository.findByIdIncludingArchived(
      context.businessId,
      productId
    );

    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }

    return this.toDetailView(row);
  }

  async createProduct(
    context: CurrentBusinessContext,
    payload: CreateProductPayload
  ): Promise<ProductDetailView> {
    const parsed = createProductSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const productCode = normalizeProductCode(parsed.data.productCode);
    const exists = await this.productRepository.existsProductCode(
      context.businessId,
      productCode
    );
    if (exists) {
      throw new ProductError(
        "DUPLICATE_PRODUCT_CODE",
        PRODUCT_USER_MESSAGES.DUPLICATE_PRODUCT_CODE,
        409,
        "productCode"
      );
    }

    const typeValid = await this.referenceRepository.isActiveProductType(
      parsed.data.productTypeCode
    );
    if (!typeValid) {
      throw new ProductError(
        "INVALID_PRODUCT_TYPE",
        PRODUCT_USER_MESSAGES.INVALID_PRODUCT_TYPE,
        400,
        "productTypeCode"
      );
    }

    const ownerPartyId = parsed.data.ownerPartyId?.trim() || null;
    if (ownerPartyId) {
      const owner = await this.referenceRepository.findOwnerParty(
        context.businessId,
        ownerPartyId
      );
      if (!owner) {
        throw new ProductError(
          "OWNER_PARTY_NOT_FOUND",
          PRODUCT_USER_MESSAGES.OWNER_PARTY_NOT_FOUND,
          400,
          "ownerPartyId"
        );
      }
    }

    const recordSource = parsed.data.recordSource?.trim();
    const resolvedRecordSource =
      recordSource && isProductRecordSourceCode(recordSource)
        ? recordSource
        : parsed.data.legacyCode?.trim()
          ? PRODUCT_RECORD_SOURCE_CODES.MIGRATED
          : PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED;

    const isMigrated =
      resolvedRecordSource === PRODUCT_RECORD_SOURCE_CODES.MIGRATED;

    const created = await this.productRepository.insert({
      businessId: context.businessId,
      productCode,
      productName: parsed.data.productName.trim(),
      shortName: parsed.data.shortName?.trim() || null,
      description: parsed.data.description?.trim() || null,
      productTypeCode: parsed.data.productTypeCode,
      statusCode: resolveDefaultProductStatus(),
      ownerPartyId,
      defaultCurrency: parsed.data.defaultCurrency?.trim() || null,
      launchDate: parsed.data.launchDate?.trim() || null,
      isSellable: parsed.data.isSellable ?? false,
      isPurchasable: parsed.data.isPurchasable ?? false,
      isBookable: parsed.data.isBookable ?? false,
      isRentable: parsed.data.isRentable ?? false,
      isSubscription: parsed.data.isSubscription ?? false,
      isDigital: parsed.data.isDigital ?? false,
      recordSource: resolvedRecordSource,
      legacyCode: parsed.data.legacyCode?.trim() || null,
      legacySystem: parsed.data.legacySystem?.trim() || null,
      migrationDate: isMigrated ? new Date() : null,
      migrationBatch: parsed.data.migrationBatch?.trim() || null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId: created.id,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_CREATED,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `Product registered — ${created.productName}`,
        referenceEntity: "product",
        referenceId: created.id,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: created.id,
      ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT,
      entityId: created.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        productCode: created.productCode,
        productName: created.productName,
        productTypeCode: created.productTypeCode,
        statusCode: created.statusCode,
        recordSource: created.recordSource,
      },
    });

    return this.getProduct(context, created.id);
  }

  async updateProduct(
    context: CurrentBusinessContext,
    productId: string,
    payload: UpdateProductPayload
  ): Promise<ProductDetailView> {
    const parsed = updateProductSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const existing = await this.requireEditableProduct(context, productId);
    const before = this.auditSnapshot(existing);

    const ownerPartyId =
      parsed.data.ownerPartyId === ""
        ? null
        : parsed.data.ownerPartyId === undefined
          ? existing.ownerPartyId
          : parsed.data.ownerPartyId;

    if (ownerPartyId) {
      const owner = await this.referenceRepository.findOwnerParty(
        context.businessId,
        ownerPartyId
      );
      if (!owner) {
        throw new ProductError(
          "OWNER_PARTY_NOT_FOUND",
          PRODUCT_USER_MESSAGES.OWNER_PARTY_NOT_FOUND,
          400,
          "ownerPartyId"
        );
      }
    }

    await this.productRepository.updateById(context.businessId, productId, {
      ...(parsed.data.productName !== undefined
        ? { productName: parsed.data.productName.trim() }
        : {}),
      ...(parsed.data.shortName !== undefined
        ? { shortName: parsed.data.shortName.trim() || null }
        : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description.trim() || null }
        : {}),
      ...(parsed.data.ownerPartyId !== undefined ? { ownerPartyId } : {}),
      ...(parsed.data.defaultCurrency !== undefined
        ? {
            defaultCurrency:
              parsed.data.defaultCurrency === ""
                ? null
                : parsed.data.defaultCurrency,
          }
        : {}),
      ...(parsed.data.launchDate !== undefined
        ? {
            launchDate:
              parsed.data.launchDate === "" ? null : parsed.data.launchDate,
          }
        : {}),
      ...(parsed.data.retirementDate !== undefined
        ? {
            retirementDate:
              parsed.data.retirementDate === ""
                ? null
                : parsed.data.retirementDate,
          }
        : {}),
      ...(parsed.data.isSellable !== undefined
        ? { isSellable: parsed.data.isSellable }
        : {}),
      ...(parsed.data.isPurchasable !== undefined
        ? { isPurchasable: parsed.data.isPurchasable }
        : {}),
      ...(parsed.data.isBookable !== undefined
        ? { isBookable: parsed.data.isBookable }
        : {}),
      ...(parsed.data.isRentable !== undefined
        ? { isRentable: parsed.data.isRentable }
        : {}),
      ...(parsed.data.isSubscription !== undefined
        ? { isSubscription: parsed.data.isSubscription }
        : {}),
      ...(parsed.data.isDigital !== undefined
        ? { isDigital: parsed.data.isDigital }
        : {}),
      updatedBy: context.platformUserId,
    });

    const updated = await this.getProduct(context, productId);

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_UPDATED,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: `Product updated — ${updated.productName}`,
        referenceEntity: "product",
        referenceId: productId,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId,
      ownerPartyId: updated.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT,
      entityId: productId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before,
      after: this.auditSnapshotFromDetail(updated),
    });

    return updated;
  }

  async activateProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductDetailView> {
    return this.transitionStatus(
      context,
      productId,
      PRODUCT_STATUS_CODES.ACTIVE,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_ACTIVATED,
      AUDIT_OPERATIONS.ACTIVATE
    );
  }

  async suspendProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductDetailView> {
    return this.transitionStatus(
      context,
      productId,
      PRODUCT_STATUS_CODES.SUSPENDED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_SUSPENDED,
      AUDIT_OPERATIONS.DEACTIVATE
    );
  }

  async archiveProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductDetailView> {
    return this.transitionStatus(
      context,
      productId,
      PRODUCT_STATUS_CODES.ARCHIVED,
      PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_ARCHIVED,
      AUDIT_OPERATIONS.ARCHIVE
    );
  }

  async validateProductCode(
    context: CurrentBusinessContext,
    productCode: string,
    excludeProductId?: string
  ): Promise<{ available: boolean }> {
    const normalized = normalizeProductCode(productCode);
    if (normalized.length < 2) {
      return { available: false };
    }

    const existing = await this.productRepository.findByProductCode(
      context.businessId,
      normalized
    );

    if (!existing) {
      return { available: true };
    }

    if (excludeProductId && existing.id === excludeProductId) {
      return { available: true };
    }

    return { available: false };
  }

  private async transitionStatus(
    context: CurrentBusinessContext,
    productId: string,
    nextStatus: ProductStatusCode,
    timelineEventType: string,
    auditOperation: string
  ): Promise<ProductDetailView> {
    const existing = await this.productRepository.findByIdIncludingArchived(
      context.businessId,
      productId
    );

    if (!existing) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }

    if (!isProductStatusCode(existing.statusCode)) {
      throw new ProductError(
        "INVALID_STATUS_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_STATUS_TRANSITION,
        400
      );
    }

    if (!canTransitionProductStatus(existing.statusCode, nextStatus)) {
      throw new ProductError(
        "INVALID_STATUS_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_STATUS_TRANSITION,
        400
      );
    }

    const statusName = await this.referenceRepository.getProductStatusName(
      nextStatus
    );

    await this.productRepository.updateById(context.businessId, productId, {
      statusCode: nextStatus,
      isActive: nextStatus === PRODUCT_STATUS_CODES.ACTIVE,
      updatedBy: context.platformUserId,
    });

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: timelineEventType,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        summary: `Status changed to ${statusName}`,
        description: `Previous status was ${existing.statusCode}.`,
        referenceEntity: "product",
        referenceId: productId,
        metadata: {
          previousStatus: existing.statusCode,
          newStatus: nextStatus,
        },
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId,
      ownerPartyId: existing.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT,
      entityId: productId,
      operation: auditOperation,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: { statusCode: existing.statusCode },
      after: { statusCode: nextStatus },
    });

    if (nextStatus === PRODUCT_STATUS_CODES.ARCHIVED) {
      await createProductVariantService().cascadeArchiveForProduct(context, productId);
    }

    return this.getProduct(context, productId);
  }

  private async requireEditableProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductRow> {
    const row = await this.productRepository.findById(
      context.businessId,
      productId
    );

    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }

    if (
      isProductStatusCode(row.statusCode) &&
      !isProductEditable(row.statusCode)
    ) {
      throw new ProductError(
        "ARCHIVED_PRODUCT_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_PRODUCT_IMMUTABLE,
        400
      );
    }

    return row;
  }

  private auditSnapshot(row: ProductRow) {
    return {
      productName: row.productName,
      shortName: row.shortName,
      description: row.description,
      ownerPartyId: row.ownerPartyId,
      defaultCurrency: row.defaultCurrency,
      launchDate: row.launchDate,
      retirementDate: row.retirementDate,
      isSellable: row.isSellable,
      isPurchasable: row.isPurchasable,
      isBookable: row.isBookable,
      isRentable: row.isRentable,
      isSubscription: row.isSubscription,
      isDigital: row.isDigital,
    };
  }

  private auditSnapshotFromDetail(detail: ProductDetailView) {
    return {
      productName: detail.productName,
      shortName: detail.shortName,
      description: detail.description,
      ownerPartyId: detail.ownerPartyId,
      defaultCurrency: detail.defaultCurrency,
      launchDate: detail.launchDate,
      retirementDate: detail.retirementDate,
      isSellable: detail.isSellable,
      isPurchasable: detail.isPurchasable,
      isBookable: detail.isBookable,
      isRentable: detail.isRentable,
      isSubscription: detail.isSubscription,
      isDigital: detail.isDigital,
    };
  }

  private async toSummaryView(row: ProductRow): Promise<ProductSummaryView> {
    const [productTypeName, statusName, owner] = await Promise.all([
      this.referenceRepository.getProductTypeName(row.productTypeCode),
      this.referenceRepository.getProductStatusName(row.statusCode),
      row.ownerPartyId
        ? this.referenceRepository.findOwnerParty(
            row.businessId,
            row.ownerPartyId
          )
        : Promise.resolve(null),
    ]);

    return {
      id: row.id,
      productCode: row.productCode,
      productName: row.productName,
      shortName: row.shortName,
      productTypeCode: row.productTypeCode,
      productTypeName,
      statusCode: row.statusCode,
      statusName,
      ownerPartyId: row.ownerPartyId,
      ownerDisplayName: owner?.displayName ?? null,
      recordSource: row.recordSource,
      recordSourceLabel: recordSourceLabel(row.recordSource),
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async toDetailView(row: ProductRow): Promise<ProductDetailView> {
    const summary = await this.toSummaryView(row);

    return {
      ...summary,
      description: row.description,
      defaultCurrency: row.defaultCurrency,
      launchDate: row.launchDate,
      retirementDate: row.retirementDate,
      isSellable: row.isSellable,
      isPurchasable: row.isPurchasable,
      isBookable: row.isBookable,
      isRentable: row.isRentable,
      isSubscription: row.isSubscription,
      isDigital: row.isDigital,
      isActive: row.isActive,
      legacyCode: row.legacyCode,
      legacySystem: row.legacySystem,
      migrationDate: row.migrationDate?.toISOString() ?? null,
      migrationBatch: row.migrationBatch,
      metadata:
        row.metadata && typeof row.metadata === "object"
          ? (row.metadata as Record<string, unknown>)
          : null,
      version: row.version,
    };
  }
}

export function createProductService(): ProductService {
  return new ProductService();
}
