/**
 * Purpose:
 * Zod validators for Quotation operations.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.1)
 */

import { z } from "zod";

import {
  QUOTATION_DEFAULT_PAGE_SIZE,
  QUOTATION_STATUS_CODES,
} from "@/modules/crm/constants";

const optionalText = z.string().trim().optional().or(z.literal(""));

const uuidField = z.string().uuid("A valid identifier is required.");

const optionalUuidField = z
  .union([uuidField, z.literal(""), z.null()])
  .optional()
  .transform((value) => {
    if (!value || value === "") {
      return null;
    }
    return value;
  });

const quantityField = z.coerce
  .number({ message: "Quantity must be a number." })
  .positive("Quantity must be greater than zero.");

const priceField = z.coerce
  .number({ message: "Price must be a number." })
  .min(0, "Price cannot be negative.");

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

const metadataField = z
  .record(z.string(), z.unknown())
  .optional()
  .nullable();

export const createQuotationLineSchema = z.object({
  offeringId: uuidField,
  offeringVariantId: optionalUuidField,
  description: optionalText,
  quantity: quantityField,
  unitOfMeasureId: optionalUuidField,
  unitPrice: priceField.optional(),
  pricingItemId: optionalUuidField,
  metadata: metadataField,
});

export const updateQuotationLineSchema = z.object({
  description: optionalText.nullable(),
  quantity: quantityField.optional(),
  unitOfMeasureId: optionalUuidField,
  unitPrice: priceField.optional(),
  pricingItemId: optionalUuidField,
  metadata: metadataField,
});

export const createQuotationSchema = z.object({
  partyId: uuidField,
  crmRecordId: optionalUuidField,
  accountId: optionalUuidField,
  opportunityId: optionalUuidField,
  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code."),
  pricingCatalogueId: optionalUuidField,
  customerSegment: optionalText,
  salesChannel: optionalText,
  region: optionalText,
  validUntil: optionalDateField,
  ownerUserId: optionalUuidField,
  notes: optionalText,
  termsTemplateCode: optionalText,
  metadata: metadataField,
  lines: z
    .array(createQuotationLineSchema)
    .min(1, "Add at least one line item to the quotation.")
    .optional(),
});

export const updateQuotationHeaderSchema = z.object({
  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code.")
    .optional(),
  pricingCatalogueId: optionalUuidField,
  customerSegment: optionalText.nullable(),
  salesChannel: optionalText.nullable(),
  region: optionalText.nullable(),
  validUntil: optionalDateField,
  ownerUserId: optionalUuidField,
  notes: optionalText.nullable(),
  termsTemplateCode: optionalText.nullable(),
  metadata: metadataField,
});

export const quotationSearchFiltersSchema = z.object({
  query: optionalText,
  status: z
    .enum([
      QUOTATION_STATUS_CODES.DRAFT,
      QUOTATION_STATUS_CODES.SENT,
      QUOTATION_STATUS_CODES.ACCEPTED,
      QUOTATION_STATUS_CODES.REJECTED,
      QUOTATION_STATUS_CODES.EXPIRED,
    ])
    .optional(),
  partyId: optionalUuidField,
  accountId: optionalUuidField,
  opportunityId: optionalUuidField,
  crmRecordId: optionalUuidField,
  ownerUserId: optionalUuidField,
  validUntilBefore: optionalDateField,
  validUntilAfter: optionalDateField,
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(QUOTATION_DEFAULT_PAGE_SIZE),
});

export const quotationIdParamSchema = z.object({
  quotationId: uuidField,
});

export const quotationLineIdParamSchema = quotationIdParamSchema.extend({
  lineId: uuidField,
});

export const quotationVersionParamSchema = quotationIdParamSchema.extend({
  versionNumber: z.coerce.number().int().min(1),
});

export const reviseQuotationSchema = z.object({
  quotationId: uuidField,
  revisionReason: optionalText,
});

export const transitionQuotationStatusSchema = z.object({
  quotationId: uuidField,
  status: z.enum([
    QUOTATION_STATUS_CODES.ACCEPTED,
    QUOTATION_STATUS_CODES.REJECTED,
    QUOTATION_STATUS_CODES.EXPIRED,
  ]),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type CreateQuotationLineInput = z.infer<typeof createQuotationLineSchema>;
export type UpdateQuotationHeaderInput = z.infer<typeof updateQuotationHeaderSchema>;
export type UpdateQuotationLineInput = z.infer<typeof updateQuotationLineSchema>;
export type QuotationSearchFiltersInput = z.infer<
  typeof quotationSearchFiltersSchema
>;
