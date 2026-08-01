/**
 * Purpose:
 * Zod validators for Product Attributes Engine payloads.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import { z } from "zod";

import {
  ATTRIBUTE_DATA_TYPES,
  ATTRIBUTE_DEFINITION_STATUS_CODES,
  ATTRIBUTE_GROUP_STATUS_CODES,
  ATTRIBUTE_OPTION_STATUS_CODES,
  ATTRIBUTE_SCOPE_TYPES,
} from "@/modules/product/constants";

const attributeValidationRuleSchema = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  minValue: z.number().nullable().optional(),
  maxValue: z.number().nullable().optional(),
  minLength: z.number().int().min(0).nullable().optional(),
  maxLength: z.number().int().min(0).nullable().optional(),
  regex: z.string().nullable().optional(),
  precision: z.number().int().min(0).nullable().optional(),
});

export const createAttributeGroupSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional(),
  displayOrder: z.number().int().min(0).optional(),
  status: z.enum([
    ATTRIBUTE_GROUP_STATUS_CODES.ACTIVE,
    ATTRIBUTE_GROUP_STATUS_CODES.SUSPENDED,
    ATTRIBUTE_GROUP_STATUS_CODES.ARCHIVED,
  ]).optional(),
});

export const updateAttributeGroupSchema = createAttributeGroupSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createAttributeDefinitionSchema = z.object({
  attributeGroupId: z.string().uuid(),
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional(),
  dataType: z.enum(Object.values(ATTRIBUTE_DATA_TYPES) as [string, ...string[]]),
  validationRule: attributeValidationRuleSchema.optional(),
  defaultValue: z.string().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isMandatory: z.boolean().optional(),
  isReadOnly: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  status: z.enum([
    ATTRIBUTE_DEFINITION_STATUS_CODES.DRAFT,
    ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE,
    ATTRIBUTE_DEFINITION_STATUS_CODES.SUSPENDED,
    ATTRIBUTE_DEFINITION_STATUS_CODES.ARCHIVED,
  ]).optional(),
});

export const updateAttributeDefinitionSchema = createAttributeDefinitionSchema
  .omit({ attributeGroupId: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createAttributeOptionSchema = z.object({
  optionCode: z.string().trim().min(1).max(80),
  optionLabel: z.string().trim().min(1).max(300),
  displayOrder: z.number().int().min(0).optional(),
  status: z.enum([
    ATTRIBUTE_OPTION_STATUS_CODES.ACTIVE,
    ATTRIBUTE_OPTION_STATUS_CODES.ARCHIVED,
  ]).optional(),
});

export const updateAttributeOptionSchema = createAttributeOptionSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const assignAttributeScopeSchema = z.discriminatedUnion("scopeType", [
  z.object({
    attributeDefinitionId: z.string().uuid(),
    scopeType: z.literal(ATTRIBUTE_SCOPE_TYPES.PRODUCT_TYPE),
    productTypeCode: z.string().trim().min(1).max(80),
    displayOrder: z.number().int().min(0).optional(),
  }),
  z.object({
    attributeDefinitionId: z.string().uuid(),
    scopeType: z.literal(ATTRIBUTE_SCOPE_TYPES.CLASSIFICATION),
    classificationId: z.string().uuid(),
    displayOrder: z.number().int().min(0).optional(),
  }),
]);

export const saveProductAttributeValuesSchema = z.object({
  values: z.record(z.string(), z.unknown()),
});

export const searchAttributesSchema = z.object({
  query: z.string().trim().max(200).optional(),
  groupId: z.string().uuid().optional(),
  productTypeCode: z.string().trim().max(80).optional(),
  classificationId: z.string().uuid().optional(),
  status: z.string().trim().max(50).optional(),
});

export const searchProductsByAttributeSchema = z.object({
  attributeCode: z.string().trim().min(1).max(80),
  attributeValue: z.unknown(),
});

export type CreateAttributeGroupInput = z.infer<typeof createAttributeGroupSchema>;
export type UpdateAttributeGroupInput = z.infer<typeof updateAttributeGroupSchema>;
export type CreateAttributeDefinitionInput = z.infer<typeof createAttributeDefinitionSchema>;
export type UpdateAttributeDefinitionInput = z.infer<typeof updateAttributeDefinitionSchema>;
export type CreateAttributeOptionInput = z.infer<typeof createAttributeOptionSchema>;
export type UpdateAttributeOptionInput = z.infer<typeof updateAttributeOptionSchema>;
export type AssignAttributeScopeInput = z.infer<typeof assignAttributeScopeSchema>;
export type SaveProductAttributeValuesInput = z.infer<typeof saveProductAttributeValuesSchema>;
export type SearchAttributesInput = z.infer<typeof searchAttributesSchema>;
export type SearchProductsByAttributeInput = z.infer<typeof searchProductsByAttributeSchema>;
