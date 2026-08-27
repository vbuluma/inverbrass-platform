/**
 * Purpose:
 * Zod validators for Product Variants Engine payloads.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { z } from "zod";

import {
  PRODUCT_RECORD_SOURCE_CODES,
  VARIANT_STATUS_CODES,
} from "@/modules/product/constants";

export const createVariantSchema = z.object({
  productId: z.string().uuid(),
  variantCode: z.string().trim().min(1).max(80),
  variantName: z.string().trim().min(1).max(300),
  displayOrder: z.number().int().min(0).optional(),
  status: z.enum([
    VARIANT_STATUS_CODES.DRAFT,
    VARIANT_STATUS_CODES.ACTIVE,
    VARIANT_STATUS_CODES.SUSPENDED,
    VARIANT_STATUS_CODES.ARCHIVED,
  ]).optional(),
  recordSource: z.enum([
    PRODUCT_RECORD_SOURCE_CODES.MIGRATED,
    PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED,
    PRODUCT_RECORD_SOURCE_CODES.API,
  ]).optional(),
  attributes: z
    .array(
      z.object({
        attributeDefinitionId: z.string().uuid(),
        value: z.unknown(),
      })
    )
    .min(1, "At least one distinguishing attribute is required."),
});

export const updateVariantSchema = z.object({
  variantName: z.string().trim().min(1).max(300).optional(),
  displayOrder: z.number().int().min(0).optional(),
  status: z.enum([
    VARIANT_STATUS_CODES.DRAFT,
    VARIANT_STATUS_CODES.ACTIVE,
    VARIANT_STATUS_CODES.SUSPENDED,
    VARIANT_STATUS_CODES.ARCHIVED,
  ]).optional(),
  attributes: z
    .array(
      z.object({
        attributeDefinitionId: z.string().uuid(),
        value: z.unknown(),
      })
    )
    .optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field is required.",
});

export const cloneVariantSchema = z.object({
  variantCode: z.string().trim().min(1).max(80).optional(),
  variantName: z.string().trim().min(1).max(300).optional(),
});

export const searchVariantsSchema = z.object({
  query: z.string().trim().max(200).optional(),
  productId: z.string().uuid().optional(),
  status: z.string().trim().max(50).optional(),
  attributeCode: z.string().trim().max(80).optional(),
  attributeValue: z.unknown().optional(),
});

export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type CloneVariantInput = z.infer<typeof cloneVariantSchema>;
export type SearchVariantsInput = z.infer<typeof searchVariantsSchema>;
