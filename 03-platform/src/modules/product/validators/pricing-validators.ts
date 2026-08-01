/**
 * Purpose:
 * Zod validators for Offering Pricing operations.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { z } from "zod";

import {
  PRICING_CATALOGUE_STATUS_CODES,
  PRICING_ITEM_STATUS_CODES,
} from "@/modules/product/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const uuidField = z.string().uuid("A valid identifier is required.");

const priceField = z.coerce
  .number({ message: "Price must be a number." })
  .min(0, "Price cannot be negative.");

const optionalPriceField = z
  .union([z.coerce.number().min(0), z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  });

const dateField = z
  .string()
  .trim()
  .min(1, "Effective date is required.")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Enter a valid date.",
  });

const optionalDateField = z
  .union([
    z.string().trim().min(1).refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Enter a valid date.",
    }),
    z.literal(""),
    z.null(),
  ])
  .optional()
  .transform((value) => {
    if (!value || value === "") {
      return null;
    }
    return value;
  });

export const createPricingCatalogueSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Catalogue code must be at least 2 characters.")
    .max(80, "Catalogue code is too long."),
  name: z
    .string()
    .trim()
    .min(2, "Catalogue name is required.")
    .max(300, "Catalogue name is too long."),
  description: optionalText,
  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code."),
  effectiveFrom: optionalDateField,
  effectiveTo: optionalDateField,
});

export const updatePricingCatalogueSchema = createPricingCatalogueSchema
  .partial()
  .extend({
    status: z
      .enum([
        PRICING_CATALOGUE_STATUS_CODES.DRAFT,
        PRICING_CATALOGUE_STATUS_CODES.ACTIVE,
        PRICING_CATALOGUE_STATUS_CODES.SUSPENDED,
        PRICING_CATALOGUE_STATUS_CODES.ARCHIVED,
      ])
      .optional(),
  });

export const createPricingItemSchema = z
  .object({
    offeringId: uuidField,
    pricingCatalogueId: uuidField,
    currencyCode: z
      .string()
      .trim()
      .length(3, "Currency must be a 3-letter code."),
    unitPrice: priceField,
    minimumPrice: optionalPriceField,
    maximumPrice: optionalPriceField,
    pricingMethod: z.string().trim().min(1, "Pricing method is required."),
    customerSegment: optionalText,
    salesChannel: optionalText,
    region: optionalText,
    effectiveFrom: dateField,
    effectiveTo: optionalDateField,
  })
  .superRefine((data, ctx) => {
    if (
      data.minimumPrice != null &&
      data.maximumPrice != null &&
      data.maximumPrice < data.minimumPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Maximum price cannot be less than minimum price.",
        path: ["maximumPrice"],
      });
    }
    if (data.effectiveTo && data.effectiveFrom) {
      const from = new Date(data.effectiveFrom);
      const to = new Date(data.effectiveTo);
      if (to < from) {
        ctx.addIssue({
          code: "custom",
          message: "Effective end date cannot be before the start date.",
          path: ["effectiveTo"],
        });
      }
    }
  });

export const updatePricingItemSchema = z
  .object({
    pricingCatalogueId: uuidField.optional(),
    currencyCode: z
      .string()
      .trim()
      .length(3, "Currency must be a 3-letter code.")
      .optional(),
    unitPrice: priceField.optional(),
    minimumPrice: optionalPriceField,
    maximumPrice: optionalPriceField,
    pricingMethod: z.string().trim().min(1, "Pricing method is required.").optional(),
    customerSegment: optionalText,
    salesChannel: optionalText,
    region: optionalText,
    effectiveFrom: dateField.optional(),
    effectiveTo: optionalDateField,
  })
  .superRefine((data, ctx) => {
    if (
      data.minimumPrice != null &&
      data.maximumPrice != null &&
      data.maximumPrice < data.minimumPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Maximum price cannot be less than minimum price.",
        path: ["maximumPrice"],
      });
    }
    if (data.effectiveTo && data.effectiveFrom) {
      const from = new Date(data.effectiveFrom);
      const to = new Date(data.effectiveTo);
      if (to < from) {
        ctx.addIssue({
          code: "custom",
          message: "Effective end date cannot be before the start date.",
          path: ["effectiveTo"],
        });
      }
    }
  });

export const searchPricingItemsSchema = z.object({
  query: optionalText,
  offeringId: z.string().uuid().optional().or(z.literal("")),
  pricingCatalogueId: z.string().uuid().optional().or(z.literal("")),
  currencyCode: optionalText,
  customerSegment: optionalText,
  salesChannel: optionalText,
  region: optionalText,
  status: z
    .enum([
      PRICING_ITEM_STATUS_CODES.DRAFT,
      PRICING_ITEM_STATUS_CODES.ACTIVE,
      PRICING_ITEM_STATUS_CODES.EXPIRED,
      PRICING_ITEM_STATUS_CODES.ARCHIVED,
    ])
    .optional(),
});

export const comparePricingItemsSchema = z.object({
  itemIds: z
    .array(z.string().uuid())
    .min(2, "Select at least two prices to compare.")
    .max(6, "Compare up to six prices at a time."),
});

export type CreatePricingCatalogueInput = z.infer<
  typeof createPricingCatalogueSchema
>;
export type UpdatePricingCatalogueInput = z.infer<
  typeof updatePricingCatalogueSchema
>;
export type CreatePricingItemInput = z.infer<typeof createPricingItemSchema>;
export type UpdatePricingItemInput = z.infer<typeof updatePricingItemSchema>;
export type SearchPricingItemsInput = z.infer<typeof searchPricingItemsSchema>;
export type ComparePricingItemsInput = z.infer<
  typeof comparePricingItemsSchema
>;
