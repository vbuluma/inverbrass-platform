/**
 * Purpose:
 * Zod validators for Product Lifecycle operations.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import { z } from "zod";

import {
  PRODUCT_LIFECYCLE_RETIREMENT_REASONS,
  PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS,
} from "@/modules/product/constants";

export const setReplacementProductSchema = z.object({
  replacementProductId: z.string().uuid("Select a valid replacement product."),
  retirementReason: z
    .enum([
      PRODUCT_LIFECYCLE_RETIREMENT_REASONS.REPLACEMENT,
      PRODUCT_LIFECYCLE_RETIREMENT_REASONS.REGULATORY,
      PRODUCT_LIFECYCLE_RETIREMENT_REASONS.BUSINESS_DECISION,
      PRODUCT_LIFECYCLE_RETIREMENT_REASONS.EXPIRED,
      PRODUCT_LIFECYCLE_RETIREMENT_REASONS.MERGED,
      PRODUCT_LIFECYCLE_RETIREMENT_REASONS.OTHER,
    ])
    .optional(),
});

export const scheduleLifecycleActionSchema = z.object({
  scheduledAction: z.enum([
    PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS.ACTIVATE,
    PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS.SUSPEND,
    PRODUCT_LIFECYCLE_SCHEDULED_ACTIONS.ARCHIVE,
  ]),
  scheduledAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD)."),
});

export const lifecycleReasonSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const activateLifecycleSchema = z.object({
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date (YYYY-MM-DD).")
    .optional(),
});

export const discontinueLifecycleSchema = z.object({
  retirementReason: z.enum([
    PRODUCT_LIFECYCLE_RETIREMENT_REASONS.REPLACEMENT,
    PRODUCT_LIFECYCLE_RETIREMENT_REASONS.REGULATORY,
    PRODUCT_LIFECYCLE_RETIREMENT_REASONS.BUSINESS_DECISION,
    PRODUCT_LIFECYCLE_RETIREMENT_REASONS.EXPIRED,
    PRODUCT_LIFECYCLE_RETIREMENT_REASONS.MERGED,
    PRODUCT_LIFECYCLE_RETIREMENT_REASONS.OTHER,
  ]),
  reason: z.string().max(500).optional(),
});
