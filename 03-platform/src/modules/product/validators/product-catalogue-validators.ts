/**
 * Purpose:
 * Zod validators for Digital Catalogue Engine payloads.
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import { z } from "zod";

import { CATALOGUE_VISIBILITY_CODES } from "@/modules/product/constants";

const visibilityEnum = z.enum([
  CATALOGUE_VISIBILITY_CODES.PUBLIC,
  CATALOGUE_VISIBILITY_CODES.REGISTERED_CUSTOMERS,
  CATALOGUE_VISIBILITY_CODES.MEMBERS,
  CATALOGUE_VISIBILITY_CODES.EMPLOYEES,
  CATALOGUE_VISIBILITY_CODES.PARTNERS,
  CATALOGUE_VISIBILITY_CODES.BUSINESS_CUSTOMERS,
  CATALOGUE_VISIBILITY_CODES.CUSTOMER_SEGMENT,
]);

export const upsertPublicationSchema = z.object({
  channelCode: z.string().trim().min(1).max(80),
  published: z.boolean(),
  visibility: visibilityEnum.optional(),
  publishFrom: z.string().datetime().nullable().optional(),
  publishTo: z.string().datetime().nullable().optional(),
  featured: z.boolean().optional(),
  recommended: z.boolean().optional(),
  qrEnabled: z.boolean().optional(),
  qrSlug: z.string().trim().max(200).nullable().optional(),
});

export const searchCatalogueSchema = z.object({
  query: z.string().trim().max(200).optional(),
  channelCode: z.string().trim().max(80).optional(),
  visibility: visibilityEnum.optional(),
  productTypeCode: z.string().trim().max(80).optional(),
  publishedOnly: z.boolean().optional(),
  featuredOnly: z.boolean().optional(),
});

export const catalogueChannelQuerySchema = z.object({
  channelCode: z.string().trim().min(1).max(80),
  featuredOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export type UpsertPublicationInput = z.infer<typeof upsertPublicationSchema>;
export type SearchCatalogueInput = z.infer<typeof searchCatalogueSchema>;
export type CatalogueChannelQueryInput = z.infer<typeof catalogueChannelQuerySchema>;
