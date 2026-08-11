/**
 * Purpose:
 * CRM analytics orchestration — KPI dashboard, customer health, CSV export.
 *
 * Design rationale:
 * Live metrics from IP-10 quotations and IP-11 campaigns. Opportunity, lead,
 * case, visit, and ENG-003n SLA widgets degrade gracefully until CRM Core merges.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";

import type { CurrentBusinessContext } from "@/core/auth/types";
import { getDb } from "@/db/client";
import { campaign, campaignMember } from "@/db/schema/campaign";
import { quotation, quotationVersion } from "@/db/schema/quotation";
import {
  CAMPAIGN_MEMBER_STATUS_CODES,
  CRM_CUSTOMER_360_INSIGHT_IDS,
  CRM_CUSTOMER_360_QUICK_ACTION_IDS,
  CRM_CUSTOMER_360_WIDGET_IDS,
  CRM_METRIC_CODES,
  CRM_SNAPSHOT_PERIODS,
  QUOTATION_STATUS_CODES,
} from "@/modules/crm/constants";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import {
  createCrmMetricDefinitionRepository,
  createCrmMetricSnapshotRepository,
} from "@/modules/crm/analytics/repositories/crm-metric-repository";
import {
  calculateHealthScore,
  calculateRate,
  daysBetween,
  DEFAULT_CRM_METRIC_DEFINITIONS,
  isDormant,
  resolveChurnRisk,
  roundMetric,
  toCsv,
} from "@/modules/crm/analytics/services/crm-analytics-rules";
import type {
  CrmAnalyticsDashboardView,
  CrmAnalyticsExportView,
  CrmAnalyticsFilters,
  CrmAnalyticsKpiCardView,
  CrmAnalyticsSectionView,
  CrmCustomerAnalyticsView,
} from "@/modules/crm/analytics/types";
import { crmAnalyticsFiltersSchema } from "@/modules/crm/analytics/validators/crm-analytics-validators";

const PENDING_OPPORTUNITY = "Requires IP-03 Opportunity Management merge.";
const PENDING_LEAD = "Requires IP-02 Lead Management merge.";
const PENDING_CASES = "Requires IP-09 Case Management merge.";
const PENDING_VISITS = "Requires IP-07 Visit Management merge.";
const PENDING_SLA = "Requires ENG-003n assignment/SLA analytics.";

export class CrmAnalyticsService {
  constructor(
    private readonly definitionRepository = createCrmMetricDefinitionRepository(),
    private readonly snapshotRepository = createCrmMetricSnapshotRepository()
  ) {}

  async ensureDefaults(context: CurrentBusinessContext): Promise<void> {
    for (const definition of DEFAULT_CRM_METRIC_DEFINITIONS) {
      const existing = await this.definitionRepository.findByCode(
        context.businessId,
        definition.code
      );
      if (existing) {
        continue;
      }
      await this.definitionRepository.insert({
        businessId: context.businessId,
        code: definition.code,
        name: definition.name,
        metricCategory: definition.metricCategory,
        calculationMethod: definition.calculationMethod,
        unitOfMeasure: definition.unitOfMeasure,
        createdBy: context.platformUserId ?? null,
        updatedBy: context.platformUserId ?? null,
      });
    }
  }

  async getDashboard(
    context: CurrentBusinessContext,
    filters: CrmAnalyticsFilters = {}
  ): Promise<CrmAnalyticsDashboardView> {
    const parsed = crmAnalyticsFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      throw new CrmError(
        "INVALID_INPUT",
        parsed.error.issues[0]?.message ?? CRM_USER_MESSAGES.INVALID_INPUT,
        400
      );
    }

    await this.ensureDefaults(context);

    const sales = await this.computeSalesMetrics(context, parsed.data);
    const campaign = await this.computeCampaignMetrics(context, parsed.data);

    const sections: CrmAnalyticsSectionView[] = [
      {
        id: "sales",
        title: "Sales & Pipeline",
        description: "Quotation and opportunity KPIs.",
        available: true,
        kpis: [
          sales.quotedValue,
          sales.openQuotations,
          sales.acceptedQuotations,
          sales.acceptanceRate,
          {
            id: CRM_METRIC_CODES.PIPELINE_BY_STAGE,
            label: "Pipeline by Stage",
            value: "—",
            category: "SALES",
            available: false,
            pendingReason: PENDING_OPPORTUNITY,
            drilldownHref: null,
          },
          {
            id: CRM_METRIC_CODES.WEIGHTED_FORECAST,
            label: "Weighted Forecast",
            value: "—",
            category: "SALES",
            available: false,
            pendingReason: PENDING_OPPORTUNITY,
          },
          {
            id: CRM_METRIC_CODES.WIN_RATE,
            label: "Win Rate",
            value: "—",
            category: "SALES",
            available: false,
            pendingReason: PENDING_OPPORTUNITY,
          },
        ],
      },
      {
        id: "lead_campaign",
        title: "Lead & Campaign",
        description: "Campaign engagement and lead funnel.",
        available: true,
        kpis: [
          campaign.responseRate,
          campaign.roiProxy,
          {
            id: CRM_METRIC_CODES.LEAD_CONVERSION_RATE,
            label: "Lead Conversion Rate",
            value: "—",
            category: "LEAD_CAMPAIGN",
            available: false,
            pendingReason: PENDING_LEAD,
          },
        ],
      },
      {
        id: "service",
        title: "Service & Engagement",
        description: "Case and activity metrics.",
        available: false,
        pendingReason: PENDING_CASES,
        kpis: [
          {
            id: CRM_METRIC_CODES.CASE_SLA_COMPLIANCE,
            label: "Case SLA Compliance",
            value: "—",
            category: "SERVICE",
            available: false,
            pendingReason: PENDING_CASES,
          },
        ],
      },
      {
        id: "visits",
        title: "Visit Analytics",
        description: "Field visit coverage and action items.",
        available: false,
        pendingReason: PENDING_VISITS,
        kpis: [
          {
            id: CRM_METRIC_CODES.VISIT_COVERAGE,
            label: "Visit Coverage",
            value: "—",
            category: "VISIT",
            available: false,
            pendingReason: PENDING_VISITS,
          },
        ],
      },
      {
        id: "sla",
        title: "Assignment & SLA",
        description: "Per-owner duration, breaches, queue delays.",
        available: false,
        pendingReason: PENDING_SLA,
        kpis: [],
      },
    ];

    const kpis = sections.flatMap((section) => section.kpis);

    const [metricDefinitionCount, snapshotCount] = await Promise.all([
      this.definitionRepository.countActive(context.businessId),
      this.snapshotRepository.countByBusiness(context.businessId),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      filters: parsed.data,
      metricDefinitionCount,
      snapshotCount,
      sections,
      kpis,
    };
  }

  async refreshSnapshots(
    context: CurrentBusinessContext,
    filters: CrmAnalyticsFilters = {}
  ): Promise<CrmAnalyticsDashboardView> {
    const dashboard = await this.getDashboard(context, filters);
    const today = new Date().toISOString().slice(0, 10);
    const definitions = await this.definitionRepository.listActiveByBusinessId(
      context.businessId
    );

    for (const kpi of dashboard.kpis) {
      if (!kpi.available || typeof kpi.value === "string") {
        continue;
      }
      const definition = definitions.find((row) => row.code === kpi.id);
      if (!definition) {
        continue;
      }
      await this.snapshotRepository.insert({
        businessId: context.businessId,
        metricDefinitionId: definition.id,
        partyId: filters.partyId ?? null,
        snapshotPeriod: CRM_SNAPSHOT_PERIODS.DAILY,
        snapshotDate: today,
        metricValue: String(kpi.value),
        createdBy: context.platformUserId ?? null,
        metadata: { source: "live_refresh" },
      });
    }

    return this.getDashboard(context, filters);
  }

  async exportCsv(
    context: CurrentBusinessContext,
    filters: CrmAnalyticsFilters = {}
  ): Promise<CrmAnalyticsExportView> {
    const dashboard = await this.getDashboard(context, filters);
    const rows = dashboard.kpis.map((kpi) => ({
      metricCode: kpi.id,
      metricName: kpi.label,
      category: kpi.category,
      value: kpi.available ? kpi.value : "",
      available: kpi.available,
      pendingReason: kpi.pendingReason ?? "",
    }));

    return {
      generatedAt: dashboard.generatedAt,
      filename: `crm-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: "text/csv",
      csv: toCsv(rows),
      rows: dashboard.kpis.map((kpi) => ({
        metricCode: kpi.id,
        metricName: kpi.label,
        category: kpi.category,
        value: kpi.value,
        available: kpi.available,
        pendingReason: kpi.pendingReason,
      })),
    };
  }

  async getCustomerAnalytics(
    context: CurrentBusinessContext,
    partyId: string
  ): Promise<CrmCustomerAnalyticsView> {
    await this.ensureDefaults(context);

    const db = getDb();
    const quoteRows = await db
      .select({
        status: quotation.status,
        updatedAt: quotation.updatedAt,
        id: quotation.id,
      })
      .from(quotation)
      .where(
        and(
          eq(quotation.businessId, context.businessId),
          eq(quotation.partyId, partyId),
          isNull(quotation.deletedAt)
        )
      );

    const quoteStats = await this.aggregateQuotations(context, { partyId });

    const memberRows = await db
      .select()
      .from(campaignMember)
      .where(
        and(
          eq(campaignMember.businessId, context.businessId),
          eq(campaignMember.partyId, partyId),
          isNull(campaignMember.deletedAt)
        )
      );

    const campaignResponses = memberRows.filter((m) =>
      [
        CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
        CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
      ].includes(m.memberStatus as typeof CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED)
    ).length;

    const activityDates = [
      ...quoteRows.map((q) => q.updatedAt),
      ...memberRows.map((m) => m.updatedAt),
    ].sort((a, b) => b.getTime() - a.getTime());

    const lastActivity = activityDates[0] ?? null;
    const daysSince = lastActivity ? daysBetween(lastActivity) : null;
    const dormant = isDormant(lastActivity);
    const healthScore = calculateHealthScore({
      openQuotations: quoteStats.openCount,
      acceptedQuotations: quoteStats.acceptedCount,
      campaignEngagement: campaignResponses,
      daysSinceLastActivity: daysSince,
    });
    const churnRisk = resolveChurnRisk({
      dormant,
      openQuotations: quoteStats.openCount,
      acceptedQuotations: quoteStats.acceptedCount,
      campaignResponses,
    });

    return {
      domain: "analytics",
      partyId,
      healthScore,
      churnRisk,
      dormancyFlag: dormant,
      daysSinceLastActivity: daysSince,
      relationshipValue: quoteStats.acceptedValue + quoteStats.openValue,
      openPipelineValue: 0,
      openPipelineAvailable: false,
      openQuotations: quoteStats.openCount,
      widgets: [
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.ANALYTICS_HEALTH_SCORE,
          label: "Health Score",
          value: healthScore,
          tone: healthScore >= 60 ? "success" : healthScore >= 30 ? "warning" : "default",
          available: true,
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.ANALYTICS_CHURN_RISK,
          label: "Churn Risk",
          value: churnRisk,
          tone: churnRisk === "HIGH" ? "warning" : "default",
          available: true,
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.ANALYTICS_DORMANCY,
          label: "Dormancy",
          value: dormant ? "Dormant" : "Active",
          tone: dormant ? "warning" : "success",
          available: true,
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.ANALYTICS_RELATIONSHIP_VALUE,
          label: "Relationship Value",
          value: roundMetric(quoteStats.acceptedValue + quoteStats.openValue),
          available: true,
        },
        {
          id: CRM_CUSTOMER_360_WIDGET_IDS.ANALYTICS_OPEN_PIPELINE,
          label: "Open Pipeline Value",
          value: "—",
          available: false,
          pendingReason: "Requires IP-03 Opportunity Management merge.",
        },
      ],
      insights: [
        {
          id: CRM_CUSTOMER_360_INSIGHT_IDS.ANALYTICS_HEALTH_SUMMARY,
          label: "Health summary",
          summary: dormant
            ? `No recent activity for ${daysSince ?? "—"} days. Health score ${healthScore}.`
            : `Health score ${healthScore} with ${quoteStats.openCount} open quotation(s).`,
        },
      ],
      quickActions: [
        {
          id: CRM_CUSTOMER_360_QUICK_ACTION_IDS.ANALYTICS_VIEW_DASHBOARD,
          label: "View CRM Dashboard",
          href: "/crm-analytics",
        },
        {
          id: CRM_CUSTOMER_360_QUICK_ACTION_IDS.ANALYTICS_EXPORT,
          label: "Export Analytics",
          href: "/crm-analytics",
        },
      ],
      futureExtensionZones: [
        {
          id: "analytics.ai_summary",
          label: "AI customer summary",
          status: "deferred",
          engineHint: "ENG-012",
        },
        {
          id: "analytics.next_best_action",
          label: "Next Best Action",
          status: "deferred",
          engineHint: "ENG-004 / ENG-012",
        },
      ],
    };
  }

  private async computeSalesMetrics(
    context: CurrentBusinessContext,
    filters: CrmAnalyticsFilters
  ): Promise<{
    quotedValue: CrmAnalyticsKpiCardView;
    openQuotations: CrmAnalyticsKpiCardView;
    acceptedQuotations: CrmAnalyticsKpiCardView;
    acceptanceRate: CrmAnalyticsKpiCardView;
  }> {
    const stats = await this.aggregateQuotations(context, filters);

    return {
      quotedValue: {
        id: CRM_METRIC_CODES.QUOTED_VALUE,
        label: "Total Quoted Value",
        value: roundMetric(stats.openValue + stats.acceptedValue + stats.sentValue),
        category: "SALES",
        available: true,
        drilldownHref: "/quotations",
      },
      openQuotations: {
        id: CRM_METRIC_CODES.OPEN_QUOTATIONS,
        label: "Open Quotations",
        value: stats.openCount,
        category: "SALES",
        available: true,
        drilldownHref: "/quotations",
      },
      acceptedQuotations: {
        id: CRM_METRIC_CODES.ACCEPTED_QUOTATIONS,
        label: "Accepted Quotations",
        value: stats.acceptedCount,
        category: "SALES",
        available: true,
        drilldownHref: "/quotations",
      },
      acceptanceRate: {
        id: CRM_METRIC_CODES.QUOTE_ACCEPTANCE_RATE,
        label: "Quote Acceptance Rate",
        value: calculateRate(
          stats.acceptedCount,
          stats.acceptedCount + stats.rejectedCount + stats.sentCount
        ),
        category: "SALES",
        available: true,
        drilldownHref: "/quotations",
      },
    };
  }

  private async computeCampaignMetrics(
    context: CurrentBusinessContext,
    _filters: CrmAnalyticsFilters
  ): Promise<{
    responseRate: CrmAnalyticsKpiCardView;
    roiProxy: CrmAnalyticsKpiCardView;
  }> {
    const db = getDb();
    const members = await db
      .select({
        status: campaignMember.memberStatus,
      })
      .from(campaignMember)
      .where(
        and(
          eq(campaignMember.businessId, context.businessId),
          isNull(campaignMember.deletedAt)
        )
      );

    const sent = members.filter((m) =>
      [
        CAMPAIGN_MEMBER_STATUS_CODES.SENT,
        CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
        CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
      ].includes(m.status as typeof CAMPAIGN_MEMBER_STATUS_CODES.SENT)
    ).length;
    const responded = members.filter((m) =>
      [
        CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED,
        CAMPAIGN_MEMBER_STATUS_CODES.CONVERTED,
      ].includes(m.status as typeof CAMPAIGN_MEMBER_STATUS_CODES.RESPONDED)
    ).length;

    const [costRow] = await db
      .select({
        budget: sql<string>`coalesce(sum(${campaign.budgetAmount}), 0)`,
        actual: sql<string>`coalesce(sum(${campaign.actualCost}), 0)`,
      })
      .from(campaign)
      .where(and(eq(campaign.businessId, context.businessId), isNull(campaign.deletedAt)));

    const budget = Number(costRow?.budget ?? 0);
    const actual = Number(costRow?.actual ?? 0);
    const roiProxy = budget > 0 ? roundMetric(((budget - actual) / budget) * 100) : 0;

    return {
      responseRate: {
        id: CRM_METRIC_CODES.CAMPAIGN_RESPONSE_RATE,
        label: "Campaign Response Rate",
        value: calculateRate(responded, sent),
        category: "LEAD_CAMPAIGN",
        available: true,
        drilldownHref: "/campaigns",
      },
      roiProxy: {
        id: CRM_METRIC_CODES.CAMPAIGN_ROI,
        label: "Campaign Budget Efficiency",
        value: roiProxy,
        category: "LEAD_CAMPAIGN",
        available: true,
        pendingReason:
          "Full ROI (pipeline/won revenue) awaits IP-03 opportunity amounts.",
        drilldownHref: "/campaigns",
      },
    };
  }

  private async aggregateQuotations(
    context: CurrentBusinessContext,
    filters: CrmAnalyticsFilters
  ) {
    const db = getDb();
    const conditions = [
      eq(quotation.businessId, context.businessId),
      isNull(quotation.deletedAt),
    ];

    if (filters.partyId) {
      conditions.push(eq(quotation.partyId, filters.partyId));
    }
    if (filters.ownerUserId) {
      conditions.push(eq(quotation.ownerUserId, filters.ownerUserId));
    }
    if (filters.dateFrom) {
      conditions.push(gte(quotation.createdAt, new Date(filters.dateFrom)));
    }
    if (filters.dateTo) {
      conditions.push(lte(quotation.createdAt, new Date(filters.dateTo)));
    }

    // Grand totals live on quotation_version — join current version
    const rows = await db
      .select({
        status: quotation.status,
        grandTotal: quotationVersion.grandTotal,
      })
      .from(quotation)
      .innerJoin(
        quotationVersion,
        and(
          eq(quotationVersion.quotationId, quotation.id),
          eq(quotationVersion.versionNumber, quotation.currentVersionNumber)
        )
      )
      .where(and(...conditions));

    const stats = {
      openCount: 0,
      sentCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      openValue: 0,
      sentValue: 0,
      acceptedValue: 0,
    };

    for (const row of rows) {
      const total = Number(row.grandTotal ?? 0);
      switch (row.status) {
        case QUOTATION_STATUS_CODES.DRAFT:
          stats.openCount += 1;
          stats.openValue += total;
          break;
        case QUOTATION_STATUS_CODES.SENT:
          stats.openCount += 1;
          stats.sentCount += 1;
          stats.sentValue += total;
          break;
        case QUOTATION_STATUS_CODES.ACCEPTED:
          stats.acceptedCount += 1;
          stats.acceptedValue += total;
          break;
        case QUOTATION_STATUS_CODES.REJECTED:
          stats.rejectedCount += 1;
          break;
        default:
          break;
      }
    }

    return stats;
  }
}

export function createCrmAnalyticsService() {
  return new CrmAnalyticsService();
}
