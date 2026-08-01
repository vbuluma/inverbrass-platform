/**
 * Purpose:
 * Zod validators for Offering Analytics operations.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { z } from "zod";

import {
  OFFERING_METRIC_CATEGORIES,
  OFFERING_SNAPSHOT_PERIODS,
} from "@/modules/product/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const dateField = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    "Enter a valid date."
  );

export const offeringAnalyticsFiltersSchema = z.object({
  dateFrom: dateField,
  dateTo: dateField,
  metricCategory: z
    .enum([
      OFFERING_METRIC_CATEGORIES.COMMERCIAL,
      OFFERING_METRIC_CATEGORIES.CUSTOMER,
      OFFERING_METRIC_CATEGORIES.OPERATIONAL,
      OFFERING_METRIC_CATEGORIES.LIFECYCLE,
      OFFERING_METRIC_CATEGORIES.COMPLIANCE,
      OFFERING_METRIC_CATEGORIES.INVENTORY,
      OFFERING_METRIC_CATEGORIES.FINANCIAL,
      OFFERING_METRIC_CATEGORIES.INDUSTRY_SPECIFIC,
    ])
    .optional(),
  snapshotPeriod: z
    .enum([
      OFFERING_SNAPSHOT_PERIODS.DAILY,
      OFFERING_SNAPSHOT_PERIODS.WEEKLY,
      OFFERING_SNAPSHOT_PERIODS.MONTHLY,
    ])
    .optional(),
  query: optionalText,
});

export const refreshOfferingAnalyticsSchema = z.object({
  offeringId: z.string().uuid("A valid offering identifier is required."),
  snapshotPeriod: z
    .enum([
      OFFERING_SNAPSHOT_PERIODS.DAILY,
      OFFERING_SNAPSHOT_PERIODS.WEEKLY,
      OFFERING_SNAPSHOT_PERIODS.MONTHLY,
    ])
    .optional(),
});

export const compareOfferingAnalyticsSchema = z.object({
  offeringIds: z
    .array(z.string().uuid())
    .min(2, "Select at least two offerings to compare.")
    .max(6, "Compare up to six offerings at a time."),
  dateFrom: dateField,
  dateTo: dateField,
  snapshotPeriod: z
    .enum([
      OFFERING_SNAPSHOT_PERIODS.DAILY,
      OFFERING_SNAPSHOT_PERIODS.WEEKLY,
      OFFERING_SNAPSHOT_PERIODS.MONTHLY,
    ])
    .optional(),
});

export const exportOfferingAnalyticsSchema = offeringAnalyticsFiltersSchema.extend({
  offeringId: z.string().uuid("A valid offering identifier is required."),
});

export type OfferingAnalyticsFiltersInput = z.infer<
  typeof offeringAnalyticsFiltersSchema
>;
export type RefreshOfferingAnalyticsInput = z.infer<
  typeof refreshOfferingAnalyticsSchema
>;
export type CompareOfferingAnalyticsInput = z.infer<
  typeof compareOfferingAnalyticsSchema
>;
export type ExportOfferingAnalyticsInput = z.infer<
  typeof exportOfferingAnalyticsSchema
>;
