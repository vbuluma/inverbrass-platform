/**
 * Purpose:
 * Zod validators for Product Foundation payloads (shape only).
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { z } from "zod";

import type { BusinessTerminology } from "@/core/industry-experience/business-terminology";
import { resolveBusinessTerminology } from "@/core/industry-experience/business-terminology";

export function buildProductValidators(terminology: BusinessTerminology) {
  const codeLabel = terminology.offerings.codeLabel;
  const nameLabel = terminology.offerings.nameLabel;
  const typeLabel = terminology.offerings.typeLabel;

  const createProductSchema = z.object({
    productCode: z
      .string()
      .trim()
      .min(2, `${codeLabel} must be at least 2 characters.`)
      .max(80, `${codeLabel} must be 80 characters or fewer.`),
    productName: z
      .string()
      .trim()
      .min(2, `${nameLabel} is required.`)
      .max(300, `${nameLabel} must be 300 characters or fewer.`),
    shortName: z
      .string()
      .trim()
      .max(100, "Short name must be 100 characters or fewer.")
      .optional()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(4000, "Description must be 4000 characters or fewer.")
      .optional()
      .or(z.literal("")),
    productTypeCode: z.string().trim().min(1, `${typeLabel} is required.`),
    ownerPartyId: z.string().uuid().optional().or(z.literal("")),
    defaultCurrency: z
      .string()
      .trim()
      .length(3, "Currency must be a 3-letter code.")
      .optional()
      .or(z.literal("")),
    launchDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Launch date must be YYYY-MM-DD.")
      .optional()
      .or(z.literal("")),
    isSellable: z.boolean().optional(),
    isPurchasable: z.boolean().optional(),
    isBookable: z.boolean().optional(),
    isRentable: z.boolean().optional(),
    isSubscription: z.boolean().optional(),
    isDigital: z.boolean().optional(),
    recordSource: z.string().trim().optional(),
    legacyCode: z.string().trim().max(100).optional().or(z.literal("")),
    legacySystem: z.string().trim().max(100).optional().or(z.literal("")),
    migrationBatch: z.string().trim().max(100).optional().or(z.literal("")),
  });

  const updateProductSchema = z.object({
    productName: z
      .string()
      .trim()
      .min(2, `${nameLabel} is required.`)
      .max(300)
      .optional(),
    shortName: z.string().trim().max(100).optional().or(z.literal("")),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    ownerPartyId: z.string().uuid().nullable().optional().or(z.literal("")),
    defaultCurrency: z
      .string()
      .trim()
      .length(3)
      .nullable()
      .optional()
      .or(z.literal("")),
    launchDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .or(z.literal("")),
    retirementDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional()
      .or(z.literal("")),
    isSellable: z.boolean().optional(),
    isPurchasable: z.boolean().optional(),
    isBookable: z.boolean().optional(),
    isRentable: z.boolean().optional(),
    isSubscription: z.boolean().optional(),
    isDigital: z.boolean().optional(),
  });

  return {
    createProductSchema,
    updateProductSchema,
  } as const;
}

const defaultValidators = buildProductValidators(resolveBusinessTerminology(null));

export const createProductSchema = defaultValidators.createProductSchema;
export const updateProductSchema = defaultValidators.updateProductSchema;

export const productListFiltersSchema = z.object({
  search: z.string().trim().max(200).optional(),
  statusCode: z.string().trim().optional(),
  productTypeCode: z.string().trim().optional(),
  recordSource: z.string().trim().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const productSearchQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters to search.")
    .max(200),
});

export const productAuditListFiltersSchema = z.object({
  operation: z.string().trim().optional(),
  entityName: z.string().trim().optional(),
  changedBy: z.string().trim().optional(),
  search: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const productTimelineListFiltersSchema = z.object({
  category: z.string().trim().optional(),
  sourceModule: z.string().trim().optional(),
  search: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});
