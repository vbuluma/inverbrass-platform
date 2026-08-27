/**
 * Purpose:
 * Offering Analytics orchestration — metric definitions, snapshots, dashboard.
 *
 * Architecture:
 * Server Actions → OfferingAnalyticsService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";
import { DEFAULT_OFFERING_WORKSPACE_LABEL } from "@/core/industry-experience/offering-terminology";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineRepository,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
} from "@/core/product-timeline";
import { getDb } from "@/db/client";
import { seedDefaultOfferingMetricsForBusiness } from "@/db/seeds/offering-metric-defaults-seed";
import {
  OFFERING_METRIC_CALCULATION_METHODS,
  PRICING_ITEM_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createOfferingMetricDefinitionRepository } from "@/modules/product/repositories/offering-metric-definition-repository";
import { createOfferingMetricSnapshotRepository } from "@/modules/product/repositories/offering-metric-snapshot-repository";
import { createPricingItemRepository } from "@/modules/product/repositories/pricing-item-repository";
import { createProductClassificationAssignmentRepository } from "@/modules/product/repositories/product-classification-assignment-repository";
import { createProductReferenceRepository } from "@/modules/product/repositories/product-reference-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  daysBetween,
  formatMetricDisplayValue,
  formatSnapshotDate,
  metricCategoryLabel,
  resolveDateRange,
  resolveDefaultSnapshotPeriod,
  snapshotPeriodLabel,
  statusCodeToMetricValue,
} from "@/modules/product/services/offering-analytics-rules";
import type {
  CompareOfferingAnalyticsPayload,
  OfferingAnalyticsComparisonView,
  OfferingAnalyticsDashboardView,
  OfferingAnalyticsExportView,
  OfferingAnalyticsFiltersPayload,
  OfferingAnalyticsKpiCardView,
  OfferingAnalyticsSectionView,
  OfferingMetricDefinitionView,
  OfferingMetricSnapshotView,
  ProductAnalyticsPanelView,
  RefreshOfferingAnalyticsPayload,
} from "@/modules/product/types";
import {
  compareOfferingAnalyticsSchema,
  exportOfferingAnalyticsSchema,
  offeringAnalyticsFiltersSchema,
  refreshOfferingAnalyticsSchema,
} from "@/modules/product/validators/offering-analytics-validators";

type MetricDefinitionRow = Awaited<
  ReturnType<
    ReturnType<
      typeof createOfferingMetricDefinitionRepository
    >["listActiveByBusinessId"]
  >
>[number];

type DerivedMetric = {
  value: number;
  currencyCode?: string | null;
  metadata?: Record<string, unknown> | null;
  isPendingExternalData?: boolean;
};

export class OfferingAnalyticsService {
  constructor(
    private readonly definitionRepository = createOfferingMetricDefinitionRepository(),
    private readonly snapshotRepository = createOfferingMetricSnapshotRepository(),
    private readonly productRepository = createProductRepository(),
    private readonly referenceRepository = createProductReferenceRepository(),
    private readonly assignmentRepository = createProductClassificationAssignmentRepository(),
    private readonly pricingItemRepository = createPricingItemRepository(),
    private readonly timelineRepository = createProductTimelineRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async ensureDefaults(context: CurrentBusinessContext): Promise<void> {
    await seedDefaultOfferingMetricsForBusiness(
      context.businessId,
      getDb(),
      context.platformUserId
    );
  }

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<OfferingAnalyticsDashboardView> {
    await this.ensureDefaults(context);

    const profile =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );
    const customerEntityLabel = resolveBusinessTerminology(
      profile.industryCode ?? null
    ).entities.customer.singular;

    const [definitions, snapshots, productCount] = await Promise.all([
      this.definitionRepository.listByBusinessId(context.businessId),
      this.snapshotRepository.listByBusinessId(context.businessId, {
        snapshotPeriod: resolveDefaultSnapshotPeriod(),
      }),
      this.productRepository.countByBusinessId(context.businessId),
    ]);

    const categoryMap = new Map<string, number>();
    for (const definition of definitions) {
      categoryMap.set(
        definition.metricCategory,
        (categoryMap.get(definition.metricCategory) ?? 0) + 1
      );
    }

    return {
      metricDefinitionCount: definitions.length,
      snapshotCount: snapshots.length,
      offeringsTracked: productCount,
      recentlyRefreshed: snapshots
        .slice(0, 8)
        .map((row) => this.mapSnapshotView(row, customerEntityLabel)),
      metricDefinitions: definitions.map((row) =>
        this.mapDefinitionView(row, customerEntityLabel)
      ),
      categorySummary: [...categoryMap.entries()].map(([category, count]) => ({
        category,
        categoryLabel: metricCategoryLabel(category, customerEntityLabel),
        count,
      })),
      catalogueLabel: profile.offeringWorkspaceLabel ?? DEFAULT_OFFERING_WORKSPACE_LABEL,
    };
  }

  async getProductAnalyticsPanel(
    context: CurrentBusinessContext,
    offeringId: string,
    payload: OfferingAnalyticsFiltersPayload = {}
  ): Promise<ProductAnalyticsPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.ensureDefaults(context);

    const parsed = offeringAnalyticsFiltersSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const product = await this.requireOffering(context, offeringId);
    const customerEntityLabel = await this.resolveCustomerEntityLabel(
      context.businessId
    );
    const snapshotPeriod =
      parsed.data.snapshotPeriod ?? resolveDefaultSnapshotPeriod();
    const { dateFrom, dateTo } = resolveDateRange(
      parsed.data.dateFrom,
      parsed.data.dateTo
    );

    const [definitions, snapshots] = await Promise.all([
      this.definitionRepository.listActiveByBusinessId(context.businessId),
      this.snapshotRepository.listByOfferingId(context.businessId, offeringId, {
        snapshotPeriod,
        dateFrom,
        dateTo,
        metricCategory: parsed.data.metricCategory,
      }),
    ]);

    const latestSnapshots = this.latestSnapshotsByMetric(snapshots);
    const kpiCards = this.buildKpiCards(latestSnapshots, customerEntityLabel);
    const sections = this.buildSections(latestSnapshots, customerEntityLabel);

    const statusName = await this.referenceRepository.getProductStatusName(
      product.statusCode
    );

    return {
      offeringId,
      offeringCode: product.productCode,
      offeringName: product.productName,
      statusCode: product.statusCode,
      statusName,
      lastRefreshedAt: snapshots[0]?.snapshot.createdAt.toISOString() ?? null,
      snapshotPeriod,
      snapshotPeriodLabel: snapshotPeriodLabel(snapshotPeriod),
      dateFrom,
      dateTo,
      kpiCards,
      sections,
      snapshots: snapshots.map((row) =>
        this.mapSnapshotView(row, customerEntityLabel)
      ),
      trends: snapshots
        .slice(0, 12)
        .map((row) => this.mapSnapshotView(row, customerEntityLabel)),
      metricDefinitions: definitions.map((row) =>
        this.mapDefinitionView(row, customerEntityLabel)
      ),
      exportReady: snapshots.length > 0,
    };
  }

  async refreshOfferingAnalytics(
    context: CurrentBusinessContext,
    payload: RefreshOfferingAnalyticsPayload
  ): Promise<ProductAnalyticsPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = refreshOfferingAnalyticsSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    await this.ensureDefaults(context);
    const product = await this.requireOffering(context, parsed.data.offeringId);
    const snapshotPeriod =
      parsed.data.snapshotPeriod ?? resolveDefaultSnapshotPeriod();
    const snapshotDate = formatSnapshotDate(new Date());
    const statusName = await this.referenceRepository.getProductStatusName(
      product.statusCode
    );

    const definitions =
      await this.definitionRepository.listActiveByBusinessId(context.businessId);

    const derivedValues = await this.calculatePlatformMetrics(
      context.businessId,
      product.id,
      product.statusCode,
      statusName,
      product.updatedAt
    );

    let snapshotsCreated = 0;

    for (const definition of definitions) {
      const existing = await this.snapshotRepository.findExisting(
        context.businessId,
        product.id,
        definition.id,
        snapshotPeriod,
        snapshotDate
      );

      if (existing) {
        continue;
      }

      const derived = derivedValues[definition.code];
      if (!derived) {
        continue;
      }

      if (
        definition.calculationMethod !==
        OFFERING_METRIC_CALCULATION_METHODS.PLATFORM_DERIVED
      ) {
        continue;
      }

      await this.snapshotRepository.insert({
        businessId: context.businessId,
        offeringId: product.id,
        metricDefinitionId: definition.id,
        snapshotPeriod,
        snapshotDate,
        metricValue: String(derived.value),
        currencyCode: derived.currencyCode ?? null,
        metadata: derived.metadata ?? null,
        createdBy: context.platformUserId,
      });

      snapshotsCreated += 1;
    }

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId: product.id,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.ANALYTICS_REFRESHED,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: `Analytics refreshed — ${snapshotsCreated} snapshot${snapshotsCreated === 1 ? "" : "s"} created`,
        metadata: { snapshotPeriod, snapshotDate, snapshotsCreated },
      })
    );

    if (snapshotsCreated > 0) {
      await this.timelineService.recordEvent(
        buildProductTimelineEventFromContext(context, {
          productId: product.id,
          eventType: PRODUCT_TIMELINE_EVENT_TYPES.SNAPSHOT_CREATED,
          eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
          summary: `${snapshotsCreated} metric snapshot${snapshotsCreated === 1 ? "" : "s"} generated`,
          metadata: { snapshotPeriod, snapshotDate },
        })
      );
    }

    await recordProductEntityAudit(this.auditService, context, {
      productId: product.id,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.OFFERING_METRIC_DEFINITION,
      entityId: product.id,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      metadata: {
        action: "manual_refresh",
        offeringId: product.id,
        snapshotsCreated,
        snapshotPeriod,
        snapshotDate,
      },
    });

    return this.getProductAnalyticsPanel(context, parsed.data.offeringId, {
      snapshotPeriod,
    });
  }

  async compareOfferings(
    context: CurrentBusinessContext,
    payload: CompareOfferingAnalyticsPayload
  ): Promise<OfferingAnalyticsComparisonView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = compareOfferingAnalyticsSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    await this.ensureDefaults(context);
    const customerEntityLabel = await this.resolveCustomerEntityLabel(
      context.businessId
    );
    const snapshotPeriod =
      parsed.data.snapshotPeriod ?? resolveDefaultSnapshotPeriod();
    const { dateFrom, dateTo } = resolveDateRange(
      parsed.data.dateFrom,
      parsed.data.dateTo
    );

    const offerings = [];

    for (const offeringId of parsed.data.offeringIds) {
      const product = await this.requireOffering(context, offeringId);
      const snapshots = await this.snapshotRepository.listByOfferingId(
        context.businessId,
        offeringId,
        { snapshotPeriod, dateFrom, dateTo }
      );
      const latestSnapshots = this.latestSnapshotsByMetric(snapshots);

      offerings.push({
        offeringId,
        offeringCode: product.productCode,
        offeringName: product.productName,
        kpis: this.buildKpiCards(latestSnapshots, customerEntityLabel),
      });
    }

    return { offerings };
  }

  async exportOfferingAnalytics(
    context: CurrentBusinessContext,
    offeringId: string,
    payload: OfferingAnalyticsFiltersPayload = {}
  ): Promise<OfferingAnalyticsExportView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = exportOfferingAnalyticsSchema.safeParse({
      offeringId,
      ...payload,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const panel = await this.getProductAnalyticsPanel(context, offeringId, payload);

    return {
      exportedAt: new Date().toISOString(),
      offeringId: panel.offeringId,
      offeringCode: panel.offeringCode,
      offeringName: panel.offeringName,
      snapshotPeriod: panel.snapshotPeriod,
      dateFrom: panel.dateFrom,
      dateTo: panel.dateTo,
      snapshots: panel.snapshots,
      note:
        "Export placeholder — full report generation will integrate with ENG-011 Reporting Engine.",
    };
  }

  private async calculatePlatformMetrics(
    businessId: string,
    offeringId: string,
    statusCode: string,
    statusName: string,
    updatedAt: Date
  ): Promise<Record<string, DerivedMetric>> {
    const [assignments, pricingItems, timelineCount] = await Promise.all([
      this.assignmentRepository.listActiveByProductId(businessId, offeringId),
      this.pricingItemRepository.listByOfferingId(businessId, offeringId),
      this.timelineRepository.countByProductId(businessId, offeringId),
    ]);

    const activePrices = pricingItems.filter(
      (row) => row.item.status === PRICING_ITEM_STATUS_CODES.ACTIVE
    ).length;

    const daysSinceUpdate = daysBetween(updatedAt, new Date());

    return {
      CURRENT_STATUS: {
        value: statusCodeToMetricValue(statusCode),
        metadata: {
          statusCode,
          statusLabel: statusName,
          displayValue: statusName,
        },
      },
      TOTAL_CLASSIFICATIONS: {
        value: assignments.length,
        metadata: { displayValue: String(assignments.length) },
      },
      TOTAL_PRICES: {
        value: pricingItems.length,
        metadata: { displayValue: String(pricingItems.length) },
      },
      TOTAL_ACTIVE_PRICES: {
        value: activePrices,
        metadata: { displayValue: String(activePrices) },
      },
      TIMELINE_EVENTS: {
        value: timelineCount,
        metadata: { displayValue: String(timelineCount) },
      },
      DAYS_SINCE_UPDATE: {
        value: daysSinceUpdate,
        metadata: { displayValue: `${daysSinceUpdate} days` },
      },
      TOTAL_VARIANTS: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
      TOTAL_BUNDLES: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
      TOTAL_DOCUMENTS: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
      TOTAL_RELATIONSHIPS: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
      TOTAL_SALES: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
      TOTAL_REVENUE: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
      ACTIVE_CUSTOMERS: {
        value: 0,
        isPendingExternalData: true,
        metadata: { pending: true, displayValue: "—" },
      },
    };
  }

  private latestSnapshotsByMetric(
    snapshots: Awaited<
      ReturnType<
        ReturnType<
          typeof createOfferingMetricSnapshotRepository
        >["listByOfferingId"]
      >
    >
  ) {
    const map = new Map<string, (typeof snapshots)[number]>();
    for (const row of snapshots) {
      if (!map.has(row.metricCode)) {
        map.set(row.metricCode, row);
      }
    }
    return [...map.values()];
  }

  private async resolveCustomerEntityLabel(businessId: string): Promise<string> {
    const profile =
      await this.industryExperienceService.getBusinessIndustryContext(businessId);
    return resolveBusinessTerminology(profile.industryCode ?? null).entities
      .customer.singular;
  }

  private buildKpiCards(
    snapshots: Awaited<
      ReturnType<
        ReturnType<
          typeof createOfferingMetricSnapshotRepository
        >["listByOfferingId"]
      >
    >,
    customerEntityLabel: string
  ): OfferingAnalyticsKpiCardView[] {
    return snapshots.map((row) => ({
      metricCode: row.metricCode,
      label: row.metricName,
      value: formatMetricDisplayValue(
        row.snapshot.metricValue,
        row.unitOfMeasure,
        (row.snapshot.metadata as Record<string, unknown> | null) ?? null
      ),
      category: row.metricCategory,
      categoryLabel: metricCategoryLabel(row.metricCategory, customerEntityLabel),
      trendDirection: row.snapshot.metadata &&
        typeof row.snapshot.metadata === "object" &&
        (row.snapshot.metadata as Record<string, unknown>).pending
        ? "pending"
        : "flat",
      helperText:
        row.snapshot.metadata &&
        typeof row.snapshot.metadata === "object" &&
        (row.snapshot.metadata as Record<string, unknown>).pending
          ? "Awaiting module data"
          : null,
    }));
  }

  private buildSections(
    snapshots: Awaited<
      ReturnType<
        ReturnType<
          typeof createOfferingMetricSnapshotRepository
        >["listByOfferingId"]
      >
    >,
    customerEntityLabel: string
  ): OfferingAnalyticsSectionView[] {
    const kpiCards = this.buildKpiCards(snapshots, customerEntityLabel);
    const grouped = new Map<string, OfferingAnalyticsKpiCardView[]>();

    for (const kpi of kpiCards) {
      const list = grouped.get(kpi.category) ?? [];
      list.push(kpi);
      grouped.set(kpi.category, list);
    }

    return [...grouped.entries()].map(([category, kpis]) => ({
      category,
      categoryLabel: metricCategoryLabel(category, customerEntityLabel),
      kpis,
    }));
  }

  private mapDefinitionView(
    row: MetricDefinitionRow,
    customerEntityLabel: string
  ): OfferingMetricDefinitionView {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      metricCategory: row.metricCategory,
      metricCategoryLabel: metricCategoryLabel(
        row.metricCategory,
        customerEntityLabel
      ),
      calculationMethod: row.calculationMethod,
      unitOfMeasure: row.unitOfMeasure,
      isActive: row.isActive,
    };
  }

  private mapSnapshotView(
    row: Awaited<
      ReturnType<
        ReturnType<
          typeof createOfferingMetricSnapshotRepository
        >["listByOfferingId"]
      >
    >[number],
    customerEntityLabel: string
  ): OfferingMetricSnapshotView {
    const metadata = (row.snapshot.metadata as Record<string, unknown> | null) ?? null;

    return {
      id: row.snapshot.id,
      offeringId: row.snapshot.offeringId,
      offeringCode: row.offeringCode,
      offeringName: row.offeringName,
      metricDefinitionId: row.snapshot.metricDefinitionId,
      metricCode: row.metricCode,
      metricName: row.metricName,
      metricCategory: row.metricCategory,
      metricCategoryLabel: metricCategoryLabel(
        row.metricCategory,
        customerEntityLabel
      ),
      snapshotPeriod: row.snapshot.snapshotPeriod,
      snapshotPeriodLabel: snapshotPeriodLabel(row.snapshot.snapshotPeriod),
      snapshotDate: row.snapshot.snapshotDate,
      metricValue: row.snapshot.metricValue,
      displayValue: formatMetricDisplayValue(
        row.snapshot.metricValue,
        row.unitOfMeasure,
        metadata
      ),
      currencyCode: row.snapshot.currencyCode,
      unitOfMeasure: row.unitOfMeasure,
      isPendingExternalData: Boolean(metadata?.pending),
      createdAt: row.snapshot.createdAt.toISOString(),
    };
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
}

export function createOfferingAnalyticsService() {
  return new OfferingAnalyticsService();
}
