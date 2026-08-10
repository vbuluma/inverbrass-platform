/**
 * Purpose:
 * CRM analytics view and payload types.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

export type CrmAnalyticsKpiCardView = {
  id: string;
  label: string;
  value: string | number;
  category: string;
  available: boolean;
  pendingReason?: string | null;
  drilldownHref?: string | null;
};

export type CrmAnalyticsSectionView = {
  id: string;
  title: string;
  description: string;
  available: boolean;
  pendingReason?: string | null;
  kpis: CrmAnalyticsKpiCardView[];
};

export type CrmAnalyticsFilters = {
  dateFrom?: string;
  dateTo?: string;
  partyId?: string;
  ownerUserId?: string;
};

export type CrmAnalyticsDashboardView = {
  generatedAt: string;
  filters: CrmAnalyticsFilters;
  metricDefinitionCount: number;
  snapshotCount: number;
  sections: CrmAnalyticsSectionView[];
  kpis: CrmAnalyticsKpiCardView[];
};

export type CrmAnalyticsExportRow = {
  metricCode: string;
  metricName: string;
  category: string;
  value: string | number;
  available: boolean;
  pendingReason?: string | null;
};

export type CrmAnalyticsExportView = {
  generatedAt: string;
  filename: string;
  contentType: "text/csv";
  csv: string;
  rows: CrmAnalyticsExportRow[];
};

export type CrmCustomerAnalyticsView = {
  domain: "analytics";
  partyId: string;
  healthScore: number;
  churnRisk: "LOW" | "MEDIUM" | "HIGH";
  dormancyFlag: boolean;
  daysSinceLastActivity: number | null;
  relationshipValue: number;
  openPipelineValue: number;
  openPipelineAvailable: boolean;
  openQuotations: number;
  widgets: Array<{
    id: string;
    label: string;
    value: string | number;
    tone?: "default" | "warning" | "success";
    available?: boolean;
    pendingReason?: string | null;
  }>;
  insights: Array<{
    id: string;
    label: string;
    summary: string;
  }>;
  quickActions: Array<{
    id: string;
    label: string;
    href: string;
  }>;
  /**
   * Expandable zones for future ENG-012 / AI capabilities.
   * v1 leaves these empty — do not invent AI scores here.
   */
  futureExtensionZones: Array<{
    id: string;
    label: string;
    status: "deferred";
    engineHint: string;
  }>;
};

export type CrmMetricDefinitionInsertValues = {
  businessId: string;
  code: string;
  name: string;
  description?: string | null;
  metricCategory: string;
  calculationMethod: string;
  unitOfMeasure?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type CrmMetricSnapshotInsertValues = {
  businessId: string;
  metricDefinitionId: string;
  partyId?: string | null;
  snapshotPeriod: string;
  snapshotDate: string;
  metricValue: string;
  currencyCode?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
};
