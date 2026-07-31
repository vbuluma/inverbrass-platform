/**
 * Purpose:
 * Zod shape validation for Catalogue Structure operations.
 */

import { z } from "zod";

export const nullableTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const createProductClassificationSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Category code is required.")
    .max(80, "Category code must be 80 characters or fewer."),
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .max(300, "Category name must be 300 characters or fewer."),
  description: z.string().trim().max(4000).optional(),
  classificationTypeCode: z.string().trim().max(50).optional(),
  industryCode: nullableTrimmed,
  icon: z.string().trim().max(50).nullable().optional(),
  parentClassificationId: z.string().uuid().nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective date must be YYYY-MM-DD.")
    .optional(),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  businessUnit: z.string().trim().max(200).nullable().optional(),
  approvalStatus: z.string().trim().max(50).optional(),
  reasonForChange: z.string().trim().max(2000).nullable().optional(),
});

export const updateProductClassificationSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  description: nullableTrimmed,
  classificationTypeCode: z.string().trim().max(50).optional(),
  industryCode: nullableTrimmed,
  icon: z.string().trim().max(50).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).optional(),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  ownerPartyId: z.string().uuid().nullable().optional(),
  businessUnit: z.string().trim().max(200).nullable().optional(),
  approvalStatus: z.string().trim().max(50).optional(),
  reasonForChange: nullableTrimmed,
});

export const moveProductClassificationSchema = z.object({
  parentClassificationId: z.string().uuid().nullable(),
  displayOrder: z.coerce.number().int().min(0).optional(),
});

export const searchProductClassificationsSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: z.string().trim().max(50).optional(),
  classificationTypeCode: z.string().trim().max(50).optional(),
  industryCode: z.string().trim().max(50).optional(),
  parentClassificationId: z.string().uuid().nullable().optional(),
});

export const assignProductClassificationSchema = z.object({
  classificationId: z.string().uuid("Select a valid category."),
  isPrimary: z.boolean().optional(),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const setPrimaryClassificationSchema = z.object({
  assignmentId: z.string().uuid("Select a valid assignment."),
});

export type CreateProductClassificationInput = z.infer<
  typeof createProductClassificationSchema
>;
export type UpdateProductClassificationInput = z.infer<
  typeof updateProductClassificationSchema
>;
export type MoveProductClassificationInput = z.infer<
  typeof moveProductClassificationSchema
>;
export type SearchProductClassificationsInput = z.infer<
  typeof searchProductClassificationsSchema
>;
export type AssignProductClassificationInput = z.infer<
  typeof assignProductClassificationSchema
>;
