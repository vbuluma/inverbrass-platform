/**
 * Purpose:
 * Pure offering analytics business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import {
  OFFERING_METRIC_CATEGORIES,
  OFFERING_SNAPSHOT_PERIODS,
  PRODUCT_STATUS_CODES,
  type OfferingMetricCategory,
  type OfferingSnapshotPeriod,
} from "@/modules/product/constants";

export function isOfferingSnapshotPeriod(
  value: string
): value is OfferingSnapshotPeriod {
  return (
    value === OFFERING_SNAPSHOT_PERIODS.DAILY ||
    value === OFFERING_SNAPSHOT_PERIODS.WEEKLY ||
    value === OFFERING_SNAPSHOT_PERIODS.MONTHLY
  );
}

export function isOfferingMetricCategory(
  value: string
): value is OfferingMetricCategory {
  return Object.values(OFFERING_METRIC_CATEGORIES).includes(
    value as OfferingMetricCategory
  );
}

export function resolveDefaultSnapshotPeriod(): OfferingSnapshotPeriod {
  return OFFERING_SNAPSHOT_PERIODS.DAILY;
}

export function formatSnapshotDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function resolveDateRange(
  dateFrom?: string | null,
  dateTo?: string | null
): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const defaultTo = formatSnapshotDate(today);
  const defaultFromDate = new Date(today);
  defaultFromDate.setDate(defaultFromDate.getDate() - 30);

  return {
    dateFrom: dateFrom && dateFrom.trim().length > 0
      ? dateFrom.slice(0, 10)
      : formatSnapshotDate(defaultFromDate),
    dateTo: dateTo && dateTo.trim().length > 0 ? dateTo.slice(0, 10) : defaultTo,
  };
}

export function statusCodeToMetricValue(statusCode: string): number {
  switch (statusCode) {
    case PRODUCT_STATUS_CODES.DRAFT:
      return 1;
    case PRODUCT_STATUS_CODES.ACTIVE:
      return 2;
    case PRODUCT_STATUS_CODES.SUSPENDED:
      return 3;
    case PRODUCT_STATUS_CODES.DISCONTINUED:
      return 4;
    case PRODUCT_STATUS_CODES.ARCHIVED:
      return 5;
    default:
      return 0;
  }
}

export function metricCategoryLabel(category: string): string {
  switch (category) {
    case OFFERING_METRIC_CATEGORIES.COMMERCIAL:
      return "Commercial";
    case OFFERING_METRIC_CATEGORIES.CUSTOMER:
      return "Customer";
    case OFFERING_METRIC_CATEGORIES.OPERATIONAL:
      return "Operational";
    case OFFERING_METRIC_CATEGORIES.LIFECYCLE:
      return "Lifecycle";
    case OFFERING_METRIC_CATEGORIES.COMPLIANCE:
      return "Compliance";
    case OFFERING_METRIC_CATEGORIES.INVENTORY:
      return "Inventory";
    case OFFERING_METRIC_CATEGORIES.FINANCIAL:
      return "Financial";
    case OFFERING_METRIC_CATEGORIES.INDUSTRY_SPECIFIC:
      return "Industry-specific";
    default:
      return category;
  }
}

export function snapshotPeriodLabel(period: string): string {
  switch (period) {
    case OFFERING_SNAPSHOT_PERIODS.DAILY:
      return "Daily";
    case OFFERING_SNAPSHOT_PERIODS.WEEKLY:
      return "Weekly";
    case OFFERING_SNAPSHOT_PERIODS.MONTHLY:
      return "Monthly";
    default:
      return period;
  }
}

export function formatMetricDisplayValue(
  value: string | number,
  unitOfMeasure?: string | null,
  metadata?: Record<string, unknown> | null
): string {
  if (metadata?.displayValue && typeof metadata.displayValue === "string") {
    return metadata.displayValue;
  }

  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  if (unitOfMeasure === "STATUS" && metadata?.statusLabel) {
    return String(metadata.statusLabel);
  }

  if (unitOfMeasure === "CURRENCY" && metadata?.currencyCode) {
    return `${numeric.toLocaleString()} ${metadata.currencyCode}`;
  }

  if (unitOfMeasure === "DAYS") {
    return `${numeric} day${numeric === 1 ? "" : "s"}`;
  }

  return numeric.toLocaleString();
}

export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}
