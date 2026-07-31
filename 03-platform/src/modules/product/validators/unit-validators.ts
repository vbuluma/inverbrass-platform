/**
 * Purpose:
 * Zod validation for Units of Measure operations.
 */

import { z } from "zod";

import {
  UNIT_ROUNDING_RULES,
  UNIT_STATUS_CODES,
} from "@/modules/product/constants";

export const nullableTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const unitStatusSchema = z.enum([
  UNIT_STATUS_CODES.DRAFT,
  UNIT_STATUS_CODES.ACTIVE,
  UNIT_STATUS_CODES.SUSPENDED,
  UNIT_STATUS_CODES.ARCHIVED,
]);

const roundingRuleSchema = z.enum([
  UNIT_ROUNDING_RULES.HALF_UP,
  UNIT_ROUNDING_RULES.HALF_DOWN,
  UNIT_ROUNDING_RULES.CEILING,
  UNIT_ROUNDING_RULES.FLOOR,
  UNIT_ROUNDING_RULES.TRUNCATE,
]);

export const createUnitSchema = z.object({
  categoryId: z.string().uuid("Select a valid category."),
  code: z
    .string()
    .trim()
    .min(1, "Unit code is required.")
    .max(80, "Unit code must be 80 characters or fewer."),
  name: z
    .string()
    .trim()
    .min(1, "Unit name is required.")
    .max(300, "Unit name must be 300 characters or fewer."),
  symbol: z
    .string()
    .trim()
    .min(1, "Symbol is required.")
    .max(20, "Symbol must be 20 characters or fewer."),
  isBaseUnit: z.boolean().optional(),
  conversionFactor: z.coerce
    .number()
    .positive("Conversion factor must be greater than zero."),
  decimalPrecision: z.coerce.number().int().min(0).max(10).optional(),
  roundingRule: roundingRuleSchema.optional(),
  status: unitStatusSchema.optional(),
});

export const updateUnitSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  symbol: z.string().trim().min(1).max(20).optional(),
  conversionFactor: z.coerce.number().positive().optional(),
  decimalPrecision: z.coerce.number().int().min(0).max(10).optional(),
  roundingRule: roundingRuleSchema.optional(),
  isBaseUnit: z.boolean().optional(),
  status: unitStatusSchema.optional(),
});

export const searchUnitsSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: z.string().trim().max(50).optional(),
  categoryId: z.string().uuid().optional(),
});

export const convertUnitsSchema = z.object({
  fromUnitId: z.string().uuid(),
  toUnitId: z.string().uuid(),
  value: z.coerce.number(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type SearchUnitsInput = z.infer<typeof searchUnitsSchema>;
export type ConvertUnitsInput = z.infer<typeof convertUnitsSchema>;
