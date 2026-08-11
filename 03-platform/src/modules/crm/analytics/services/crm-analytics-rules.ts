/**
 * Purpose:
 * Pure CRM analytics helpers — rates, dormancy, health score.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

import {
  DEFAULT_DORMANCY_DAYS,
  DEFAULT_HEALTH_SCORE_WEIGHTS,
} from "@/modules/crm/constants";

export function roundMetric(value: number, digits = 2): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }
  return roundMetric((numerator / denominator) * 100);
}

export function daysBetween(from: Date, to: Date = new Date()): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function isDormant(
  lastActivityAt: Date | null | undefined,
  dormancyDays: number = DEFAULT_DORMANCY_DAYS,
  now: Date = new Date()
): boolean {
  if (!lastActivityAt) {
    return true;
  }
  return daysBetween(lastActivityAt, now) >= dormancyDays;
}

export function resolveChurnRisk(input: {
  dormant: boolean;
  openQuotations: number;
  acceptedQuotations: number;
  campaignResponses: number;
}): "LOW" | "MEDIUM" | "HIGH" {
  if (input.dormant && input.openQuotations === 0 && input.campaignResponses === 0) {
    return "HIGH";
  }
  if (input.dormant || (input.openQuotations === 0 && input.acceptedQuotations === 0)) {
    return "MEDIUM";
  }
  return "LOW";
}

export function calculateHealthScore(input: {
  openQuotations: number;
  acceptedQuotations: number;
  campaignEngagement: number;
  daysSinceLastActivity: number | null;
  dormancyDays?: number;
}): number {
  const weights = DEFAULT_HEALTH_SCORE_WEIGHTS;
  const dormancyDays = input.dormancyDays ?? DEFAULT_DORMANCY_DAYS;

  const openScore = Math.min(input.openQuotations * 10, weights.openQuotes);
  const acceptedScore = Math.min(
    input.acceptedQuotations * 20,
    weights.acceptedQuotes
  );
  const engagementScore = Math.min(
    input.campaignEngagement * 10,
    weights.campaignEngagement
  );

  let recencyScore = 0;
  if (input.daysSinceLastActivity == null) {
    recencyScore = 0;
  } else if (input.daysSinceLastActivity <= 30) {
    recencyScore = weights.recency;
  } else if (input.daysSinceLastActivity < dormancyDays) {
    recencyScore = Math.round(weights.recency / 2);
  }

  return Math.min(
    100,
    Math.round(openScore + acceptedScore + engagementScore + recencyScore)
  );
}

export function toCsv(rows: Array<Record<string, string | number | boolean>>): string {
  if (rows.length === 0) {
    return "metricCode,metricName,category,value,available,pendingReason\n";
  }
  const headers = Object.keys(rows[0]!);
  const escape = (value: string | number | boolean) => {
    const text = String(value);
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h]!)).join(",")),
  ].join("\n");
}

export const DEFAULT_CRM_METRIC_DEFINITIONS = [
  {
    code: "kpi.quoted_value",
    name: "Total Quoted Value",
    metricCategory: "SALES",
    calculationMethod: "SUM",
    unitOfMeasure: "currency",
  },
  {
    code: "kpi.open_quotations",
    name: "Open Quotations",
    metricCategory: "SALES",
    calculationMethod: "COUNT",
    unitOfMeasure: "count",
  },
  {
    code: "kpi.accepted_quotations",
    name: "Accepted Quotations",
    metricCategory: "SALES",
    calculationMethod: "COUNT",
    unitOfMeasure: "count",
  },
  {
    code: "kpi.quote_acceptance_rate",
    name: "Quote Acceptance Rate",
    metricCategory: "SALES",
    calculationMethod: "RATE",
    unitOfMeasure: "percent",
  },
  {
    code: "kpi.pipeline_by_stage",
    name: "Pipeline by Stage",
    metricCategory: "SALES",
    calculationMethod: "SUM",
    unitOfMeasure: "currency",
  },
  {
    code: "kpi.weighted_forecast",
    name: "Weighted Forecast",
    metricCategory: "SALES",
    calculationMethod: "SUM",
    unitOfMeasure: "currency",
  },
  {
    code: "kpi.win_rate",
    name: "Win Rate",
    metricCategory: "SALES",
    calculationMethod: "RATE",
    unitOfMeasure: "percent",
  },
  {
    code: "kpi.campaign_roi",
    name: "Campaign ROI",
    metricCategory: "LEAD_CAMPAIGN",
    calculationMethod: "RATE",
    unitOfMeasure: "ratio",
  },
  {
    code: "kpi.campaign_response_rate",
    name: "Campaign Response Rate",
    metricCategory: "LEAD_CAMPAIGN",
    calculationMethod: "RATE",
    unitOfMeasure: "percent",
  },
  {
    code: "kpi.lead_conversion_rate",
    name: "Lead Conversion Rate",
    metricCategory: "LEAD_CAMPAIGN",
    calculationMethod: "RATE",
    unitOfMeasure: "percent",
  },
  {
    code: "kpi.case_sla_compliance",
    name: "Case SLA Compliance",
    metricCategory: "SERVICE",
    calculationMethod: "RATE",
    unitOfMeasure: "percent",
  },
  {
    code: "kpi.visit_coverage",
    name: "Visit Coverage",
    metricCategory: "VISIT",
    calculationMethod: "RATE",
    unitOfMeasure: "percent",
  },
  {
    code: "analytics.health_score",
    name: "Customer Health Score",
    metricCategory: "CUSTOMER_HEALTH",
    calculationMethod: "RULE",
    unitOfMeasure: "score",
  },
  {
    code: "analytics.dormancy",
    name: "Dormancy Flag",
    metricCategory: "CUSTOMER_HEALTH",
    calculationMethod: "RULE",
    unitOfMeasure: "flag",
  },
] as const;
