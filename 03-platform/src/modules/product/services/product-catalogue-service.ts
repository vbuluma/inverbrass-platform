/**
 * Purpose:
 * Digital Catalogue Engine — publishing, visibility, search, and channel capabilities.
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import { resolveDigitalCatalogueLabel } from "@/core/industry-experience/digital-catalogue-terminology";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline";
import {
  CATALOGUE_VISIBILITY_CODES,
  PRODUCT_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createCatalogueChannelRepository } from "@/modules/product/repositories/catalogue-channel-repository";
import { createProductCataloguePublicationRepository } from "@/modules/product/repositories/product-catalogue-publication-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  buildQrSlug,
  isProductPublishable,
  isPublicationCurrentlyActive,
  normalizePublicationMetadata,
  validatePublicationSchedule,
  visibilityLabel,
  visibilityOptions,
} from "@/modules/product/services/product-catalogue-rules";
import type {
  CatalogueDashboardEntryView,
  CatalogueDashboardView,
  CataloguePublicationView,
  CatalogueWorkspaceView,
  ProductCataloguePanelView,
  PublishedCatalogueProductView,
  SearchCataloguePayload,
  UpsertPublicationPayload,
} from "@/modules/product/types";
import {
  catalogueChannelQuerySchema,
  searchCatalogueSchema,
  upsertPublicationSchema,
} from "@/modules/product/validators/product-catalogue-validators";

export class ProductCatalogueService {
  constructor(
    private readonly channelRepository = createCatalogueChannelRepository(),
    private readonly publicationRepository = createProductCataloguePublicationRepository(),
    private readonly productRepository = createProductRepository(),
    private readonly productTimelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getDashboard(context: CurrentBusinessContext): Promise<CatalogueDashboardView> {
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const [channels, publishedCount, featuredCount, scheduledCount, activeProducts] =
      await Promise.all([
        this.channelRepository.listActive(),
        this.publicationRepository.countPublishedProducts(context.businessId),
        this.publicationRepository.countFeatured(context.businessId),
        this.publicationRepository.countScheduled(context.businessId),
        this.productRepository.listByBusinessId(context.businessId, {
          limit: 200,
          statusCode: PRODUCT_STATUS_CODES.ACTIVE,
        }),
      ]);

    const publicationRows = await this.publicationRepository.search(context.businessId, {
      publishedOnly: false,
    });

    const productMap = new Map<string, CatalogueDashboardEntryView>();

    for (const row of publicationRows) {
      const existing = productMap.get(row.product.id);
      const publishedIncrement = row.publication.published ? 1 : 0;
      const featuredIncrement =
        row.publication.published && row.publication.featured ? 1 : 0;

      if (existing) {
        existing.publishedChannelCount += publishedIncrement;
        existing.featuredChannelCount += featuredIncrement;
        continue;
      }

      productMap.set(row.product.id, {
        productId: row.product.id,
        productCode: row.product.productCode,
        productName: row.product.productName,
        productTypeCode: row.product.productTypeCode,
        statusCode: row.product.statusCode,
        publishedChannelCount: publishedIncrement,
        featuredChannelCount: featuredIncrement,
        updatedAt: row.product.updatedAt.toISOString(),
      });
    }

    for (const product of activeProducts) {
      if (!productMap.has(product.id)) {
        productMap.set(product.id, {
          productId: product.id,
          productCode: product.productCode,
          productName: product.productName,
          productTypeCode: product.productTypeCode,
          statusCode: product.statusCode,
          publishedChannelCount: 0,
          featuredChannelCount: 0,
          updatedAt: product.updatedAt.toISOString(),
        });
      }
    }

    const entries = Array.from(productMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return {
      publishedProductCount: publishedCount,
      unpublishedActiveCount: Math.max(activeProducts.length - publishedCount, 0),
      scheduledPublicationCount: scheduledCount,
      featuredCount,
      channelCount: channels.length,
      catalogueLabel: resolveDigitalCatalogueLabel(profile.industryCode),
      industryCode: profile.industryCode,
      entries,
    };
  }

  async getWorkspace(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<CatalogueWorkspaceView> {
    const product = await this.requireProduct(context, productId);
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );
    const [channels, publications] = await Promise.all([
      this.channelRepository.listActive(),
      this.buildPublicationViews(context.businessId, productId),
    ]);

    return {
      productId: product.id,
      productCode: product.productCode,
      productName: product.productName,
      productDescription: product.description,
      productTypeCode: product.productTypeCode,
      statusCode: product.statusCode,
      statusLabel: product.statusCode,
      catalogueLabel: resolveDigitalCatalogueLabel(profile.industryCode),
      channels: channels.map((channel) => ({
        id: channel.id,
        code: channel.code,
        name: channel.name,
        description: channel.description,
        displayOrder: channel.displayOrder,
      })),
      publications,
      publishable: isProductPublishable(product.statusCode),
    };
  }

  async getProductCataloguePanel(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductCataloguePanelView> {
    const product = await this.requireProduct(context, productId);
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );
    const publications = await this.buildPublicationViews(context.businessId, productId);

    return {
      productId,
      catalogueLabel: resolveDigitalCatalogueLabel(profile.industryCode),
      publishable: isProductPublishable(product.statusCode),
      publications,
      workspaceHref: `/products/catalogue/${productId}`,
    };
  }

  async upsertPublication(
    context: CurrentBusinessContext,
    productId: string,
    payload: UpsertPublicationPayload
  ): Promise<CatalogueWorkspaceView> {
    const parsed = upsertPublicationSchema.parse(payload);
    const product = await this.requireProduct(context, productId);

    if (parsed.published && !isProductPublishable(product.statusCode)) {
      throw new ProductError(
        "PRODUCT_NOT_PUBLISHABLE",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_PUBLISHABLE,
        400
      );
    }

    if (
      !validatePublicationSchedule(parsed.publishFrom ?? null, parsed.publishTo ?? null)
    ) {
      throw new ProductError(
        "INVALID_PUBLICATION_SCHEDULE",
        PRODUCT_USER_MESSAGES.INVALID_PUBLICATION_SCHEDULE,
        400,
        "publishTo"
      );
    }

    const channel = await this.channelRepository.findByCode(parsed.channelCode);
    if (!channel) {
      throw new ProductError(
        "CHANNEL_NOT_FOUND",
        PRODUCT_USER_MESSAGES.CHANNEL_NOT_FOUND,
        404,
        "channelCode"
      );
    }

    const metadata = {
      qrEnabled: parsed.qrEnabled ?? false,
      qrSlug:
        parsed.qrSlug ??
        (parsed.qrEnabled ? buildQrSlug(product.productCode, channel.code) : null),
    };

    const existing = await this.publicationRepository.findByProductAndChannel(
      context.businessId,
      productId,
      channel.id
    );

    const publishFrom = parsed.publishFrom ? new Date(parsed.publishFrom) : null;
    const publishTo = parsed.publishTo ? new Date(parsed.publishTo) : null;

    if (existing) {
      const updated = await this.publicationRepository.update(
        context.businessId,
        existing.id,
        {
          published: parsed.published,
          visibility: parsed.visibility ?? existing.visibility,
          publishFrom,
          publishTo,
          featured: parsed.featured ?? existing.featured,
          recommended: parsed.recommended ?? existing.recommended,
          metadata,
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

      await this.recordPublicationTimeline(context, productId, product.productName, {
        published: parsed.published,
        channelName: channel.name,
        visibility: parsed.visibility ?? existing.visibility,
        featured: parsed.featured ?? existing.featured,
        scheduleChanged:
          publishFrom?.toISOString() !== existing.publishFrom?.toISOString() ||
          publishTo?.toISOString() !== existing.publishTo?.toISOString(),
      });

      await recordProductEntityAudit(this.auditService, context, {
        productId,
        ownerPartyId: product.ownerPartyId,
        entityName: AUDIT_ENTITY_NAMES.PRODUCT_CATALOGUE_PUBLICATION,
        entityId: updated.id,
        operation: AUDIT_OPERATIONS.UPDATE,
        sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
        before: existing,
        after: updated,
      });
    } else {
      const created = await this.publicationRepository.insert({
        businessId: context.businessId,
        productId,
        channelId: channel.id,
        published: parsed.published,
        visibility: parsed.visibility ?? CATALOGUE_VISIBILITY_CODES.PUBLIC,
        publishFrom,
        publishTo,
        featured: parsed.featured ?? false,
        recommended: parsed.recommended ?? false,
        metadata,
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      });

      await this.recordPublicationTimeline(context, productId, product.productName, {
        published: parsed.published,
        channelName: channel.name,
        visibility: created.visibility,
        featured: created.featured,
        scheduleChanged: Boolean(publishFrom || publishTo),
        isNew: true,
      });

      await recordProductEntityAudit(this.auditService, context, {
        productId,
        ownerPartyId: product.ownerPartyId,
        entityName: AUDIT_ENTITY_NAMES.PRODUCT_CATALOGUE_PUBLICATION,
        entityId: created.id,
        operation: AUDIT_OPERATIONS.CREATE,
        sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
        createValues: {
          channelCode: channel.code,
          published: created.published,
          visibility: created.visibility,
        },
      });
    }

    return this.getWorkspace(context, productId);
  }

  async searchCatalogue(
    context: CurrentBusinessContext,
    payload: SearchCataloguePayload
  ): Promise<CatalogueDashboardEntryView[]> {
    const parsed = searchCatalogueSchema.parse(payload);
    const rows = await this.publicationRepository.search(context.businessId, {
      ...parsed,
      publishedOnly: parsed.publishedOnly ?? true,
    });

    const map = new Map<string, CatalogueDashboardEntryView>();
    for (const row of rows) {
      const existing = map.get(row.product.id);
      const publishedIncrement = row.publication.published ? 1 : 0;
      const featuredIncrement =
        row.publication.published && row.publication.featured ? 1 : 0;

      if (existing) {
        existing.publishedChannelCount += publishedIncrement;
        existing.featuredChannelCount += featuredIncrement;
        continue;
      }

      map.set(row.product.id, {
        productId: row.product.id,
        productCode: row.product.productCode,
        productName: row.product.productName,
        productTypeCode: row.product.productTypeCode,
        statusCode: row.product.statusCode,
        publishedChannelCount: publishedIncrement,
        featuredChannelCount: featuredIncrement,
        updatedAt: row.product.updatedAt.toISOString(),
      });
    }

    return Array.from(map.values());
  }

  /** Capability: published products for API/channel consumers */
  async getPublishedProducts(
    context: CurrentBusinessContext,
    channelCode: string,
    featuredOnly = false
  ): Promise<PublishedCatalogueProductView[]> {
    const parsed = catalogueChannelQuerySchema.parse({ channelCode, featuredOnly });
    const rows = await this.publicationRepository.listPublishedByChannel(
      context.businessId,
      parsed.channelCode,
      parsed.featuredOnly ?? false,
      parsed.limit ?? 50
    );

    return rows
      .filter((row) =>
        isPublicationCurrentlyActive({
          published: row.publication.published,
          publishFrom: row.publication.publishFrom,
          publishTo: row.publication.publishTo,
        })
      )
      .map((row) => ({
        productId: row.product.id,
        productCode: row.product.productCode,
        productName: row.product.productName,
        productTypeCode: row.product.productTypeCode,
        channelCode: row.channelCode,
        visibility: row.publication.visibility,
        featured: row.publication.featured,
        recommended: row.publication.recommended,
      }));
  }

  getVisibilityOptions() {
    return visibilityOptions();
  }

  private async buildPublicationViews(
    businessId: string,
    productId: string
  ): Promise<CataloguePublicationView[]> {
    const [channels, existingRows] = await Promise.all([
      this.channelRepository.listActive(),
      this.publicationRepository.listByProductId(businessId, productId),
    ]);

    const byChannelId = new Map(
      existingRows.map((row) => [row.publication.channelId, row])
    );

    return channels.map((channel) => {
      const row = byChannelId.get(channel.id);
      const metadata = normalizePublicationMetadata(
        (row?.publication.metadata as Record<string, unknown> | null) ?? null
      );

      const published = row?.publication.published ?? false;
      const publishFrom = row?.publication.publishFrom?.toISOString() ?? null;
      const publishTo = row?.publication.publishTo?.toISOString() ?? null;

      return {
        id: row?.publication.id ?? null,
        channelId: channel.id,
        channelCode: channel.code,
        channelName: channel.name,
        published,
        visibility: row?.publication.visibility ?? CATALOGUE_VISIBILITY_CODES.PUBLIC,
        visibilityLabel: visibilityLabel(
          row?.publication.visibility ?? CATALOGUE_VISIBILITY_CODES.PUBLIC
        ),
        publishFrom,
        publishTo,
        featured: row?.publication.featured ?? false,
        recommended: row?.publication.recommended ?? false,
        qrEnabled: metadata.qrEnabled ?? false,
        qrSlug: metadata.qrSlug ?? null,
        version: row?.publication.version ?? 0,
        isLive: isPublicationCurrentlyActive({
          published,
          publishFrom: row?.publication.publishFrom,
          publishTo: row?.publication.publishTo,
        }),
      };
    });
  }

  private async requireProduct(context: CurrentBusinessContext, productId: string) {
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

  private async recordPublicationTimeline(
    context: CurrentBusinessContext,
    productId: string,
    productName: string,
    input: {
      published: boolean;
      channelName: string;
      visibility: string;
      featured: boolean;
      scheduleChanged: boolean;
      isNew?: boolean;
    }
  ) {
    const events: Array<{ type: string; summary: string }> = [];

    if (input.isNew) {
      events.push({
        type: PRODUCT_TIMELINE_EVENT_TYPES.CATALOGUE_CHANNEL_ADDED,
        summary: `Catalogue channel "${input.channelName}" configured`,
      });
    }

    events.push({
      type: input.published
        ? PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_PUBLISHED
        : PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_UNPUBLISHED,
      summary: input.published
        ? `"${productName}" published to ${input.channelName}`
        : `"${productName}" unpublished from ${input.channelName}`,
    });

    if (input.scheduleChanged) {
      events.push({
        type: PRODUCT_TIMELINE_EVENT_TYPES.CATALOGUE_SCHEDULE_CHANGED,
        summary: `Publication schedule updated for ${input.channelName}`,
      });
    }

    if (input.featured) {
      events.push({
        type: PRODUCT_TIMELINE_EVENT_TYPES.CATALOGUE_FEATURED_CHANGED,
        summary: `"${productName}" marked featured on ${input.channelName}`,
      });
    }

    events.push({
      type: PRODUCT_TIMELINE_EVENT_TYPES.CATALOGUE_VISIBILITY_CHANGED,
      summary: `Visibility set to ${visibilityLabel(input.visibility)} on ${input.channelName}`,
    });

    for (const event of events) {
      await this.productTimelineService.recordEvent(
        buildProductTimelineEventFromContext(context, {
          productId,
          eventType: event.type,
          eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
          summary: event.summary,
          referenceEntity: "catalogue_channel",
        })
      );
    }
  }
}

export function createProductCatalogueService() {
  return new ProductCatalogueService();
}
