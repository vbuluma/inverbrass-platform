/**
 * Purpose:
 * Zod validators for Product Bundles Engine payloads.
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import { z } from "zod";

import {
  BUNDLE_AVAILABILITY_TYPES,
  BUNDLE_PRICING_STRATEGY_CODES,
  BUNDLE_STATUS_CODES,
  BUNDLE_TYPE_CODES,
  PRODUCT_RECORD_SOURCE_CODES,
} from "@/modules/product/constants";

const bundleItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  quantity: z.number().positive("Quantity must be greater than zero."),
  mandatory: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const createBundleSchema = z.object({
  bundleCode: z.string().trim().min(1).max(80),
  bundleName: z.string().trim().min(1).max(300),
  bundleType: z.enum([
    BUNDLE_TYPE_CODES.STANDARD_PACKAGE,
    BUNDLE_TYPE_CODES.STARTER_KIT,
    BUNDLE_TYPE_CODES.PROMOTIONAL_BUNDLE,
    BUNDLE_TYPE_CODES.SUBSCRIPTION_BUNDLE,
    BUNDLE_TYPE_CODES.CROSS_SELL_BUNDLE,
    BUNDLE_TYPE_CODES.UPSELL_BUNDLE,
    BUNDLE_TYPE_CODES.SERVICE_PACKAGE,
    BUNDLE_TYPE_CODES.COMPOSITE_PRODUCT,
  ]),
  statusCode: z
    .enum([
      BUNDLE_STATUS_CODES.DRAFT,
      BUNDLE_STATUS_CODES.ACTIVE,
      BUNDLE_STATUS_CODES.SUSPENDED,
      BUNDLE_STATUS_CODES.ARCHIVED,
    ])
    .optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  pricingStrategy: z
    .enum([
      BUNDLE_PRICING_STRATEGY_CODES.SUM_OF_ITEMS,
      BUNDLE_PRICING_STRATEGY_CODES.FIXED_BUNDLE_PRICE,
      BUNDLE_PRICING_STRATEGY_CODES.PERCENTAGE_DISCOUNT,
      BUNDLE_PRICING_STRATEGY_CODES.FUTURE_RULE,
    ])
    .optional(),
  availabilityType: z
    .enum([
      BUNDLE_AVAILABILITY_TYPES.ACTIVE,
      BUNDLE_AVAILABILITY_TYPES.SEASONAL,
      BUNDLE_AVAILABILITY_TYPES.LIMITED_OFFER,
      BUNDLE_AVAILABILITY_TYPES.PERMANENT,
    ])
    .optional(),
  recordSource: z
    .enum([
      PRODUCT_RECORD_SOURCE_CODES.MIGRATED,
      PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED,
      PRODUCT_RECORD_SOURCE_CODES.API,
    ])
    .optional(),
  items: z.array(bundleItemSchema).min(1, "A bundle must contain at least one item."),
});

export const updateBundleSchema = z
  .object({
    bundleName: z.string().trim().min(1).max(300).optional(),
    bundleType: createBundleSchema.shape.bundleType.optional(),
    statusCode: createBundleSchema.shape.statusCode.optional(),
    ownerPartyId: z.string().uuid().nullable().optional(),
    description: z.string().trim().max(4000).nullable().optional(),
    effectiveFrom: z.string().nullable().optional(),
    effectiveTo: z.string().nullable().optional(),
    pricingStrategy: createBundleSchema.shape.pricingStrategy.optional(),
    availabilityType: createBundleSchema.shape.availabilityType.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const addBundleItemSchema = bundleItemSchema;

export const updateBundleItemSchema = z
  .object({
    quantity: z.number().positive().optional(),
    mandatory: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const searchBundlesSchema = z.object({
  query: z.string().trim().max(200).optional(),
  statusCode: z.string().trim().max(50).optional(),
  ownerPartyId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;
export type UpdateBundleInput = z.infer<typeof updateBundleSchema>;
export type AddBundleItemInput = z.infer<typeof addBundleItemSchema>;
export type UpdateBundleItemInput = z.infer<typeof updateBundleItemSchema>;
export type SearchBundlesInput = z.infer<typeof searchBundlesSchema>;
