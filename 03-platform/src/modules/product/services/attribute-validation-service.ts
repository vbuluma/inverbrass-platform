/**
 * Purpose:
 * Validate attribute values against definition rules (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import {
  ATTRIBUTE_DATA_TYPES,
  type AttributeDataType,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import {
  dataTypeSupportsOptions,
  mergeValidationRule,
  parseValidationRule,
  type AttributeValidationRule,
} from "@/modules/product/services/attribute-rules";

export type AttributeDefinitionForValidation = {
  code: string;
  name: string;
  dataType: string;
  isMandatory: boolean;
  isReadOnly: boolean;
  validationRule?: unknown;
  defaultValue?: string | null;
  options?: Array<{ optionCode: string; optionLabel: string; status: string }>;
};

export type AttributeValueValidationResult = {
  normalizedValue: unknown;
  errors: Array<{ field: string; message: string }>;
};

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function validateNumericType(
  value: unknown,
  dataType: AttributeDataType,
  rule: AttributeValidationRule
): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(numeric)) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `Value must be a valid number for ${dataType}.`,
      400,
      "attributeValue"
    );
  }

  if (rule.minValue != null && numeric < rule.minValue) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `Value must be at least ${rule.minValue}.`,
      400,
      "attributeValue"
    );
  }

  if (rule.maxValue != null && numeric > rule.maxValue) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `Value must be at most ${rule.maxValue}.`,
      400,
      "attributeValue"
    );
  }

  if (rule.precision != null && dataType === ATTRIBUTE_DATA_TYPES.DECIMAL) {
    const parts = String(numeric).split(".");
    const decimals = parts[1]?.length ?? 0;
    if (decimals > rule.precision) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_VALUE",
        `Value may have at most ${rule.precision} decimal places.`,
        400,
        "attributeValue"
      );
    }
  }

  return numeric;
}

function validateStringType(
  value: unknown,
  rule: AttributeValidationRule,
  dataType: AttributeDataType
): string {
  const text = String(value ?? "").trim();

  if (rule.minLength != null && text.length < rule.minLength) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `Value must be at least ${rule.minLength} characters.`,
      400,
      "attributeValue"
    );
  }

  if (rule.maxLength != null && text.length > rule.maxLength) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `Value must be at most ${rule.maxLength} characters.`,
      400,
      "attributeValue"
    );
  }

  if (rule.regex) {
    const pattern = new RegExp(rule.regex);
    if (!pattern.test(text)) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_VALUE",
        "Value does not match the required format.",
        400,
        "attributeValue"
      );
    }
  }

  if (dataType === ATTRIBUTE_DATA_TYPES.EMAIL && text.length > 0) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(text)) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_VALUE",
        "Value must be a valid email address.",
        400,
        "attributeValue"
      );
    }
  }

  if (dataType === ATTRIBUTE_DATA_TYPES.URL && text.length > 0) {
    try {
      new URL(text);
    } catch {
      throw new ProductError(
        "INVALID_ATTRIBUTE_VALUE",
        "Value must be a valid URL.",
        400,
        "attributeValue"
      );
    }
  }

  return text;
}

function validateOptionValue(
  value: unknown,
  definition: AttributeDefinitionForValidation,
  allowMultiple: boolean
): string | string[] {
  const activeOptions = (definition.options ?? []).filter(
    (option) => option.status === "ACTIVE"
  );
  const allowedCodes = new Set(activeOptions.map((option) => option.optionCode));

  if (allowMultiple) {
    const values = Array.isArray(value)
      ? value.map(String)
      : typeof value === "string"
        ? value.split(",").map((item) => item.trim()).filter(Boolean)
        : [];

    for (const item of values) {
      if (!allowedCodes.has(item)) {
        throw new ProductError(
          "INVALID_ATTRIBUTE_VALUE",
          `Invalid option "${item}" for ${definition.name}.`,
          400,
          "attributeValue"
        );
      }
    }
    return values;
  }

  const selected = String(value ?? "").trim();
  if (selected && !allowedCodes.has(selected)) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `Invalid option "${selected}" for ${definition.name}.`,
      400,
      "attributeValue"
    );
  }
  return selected;
}

export function validateAttributeValue(
  definition: AttributeDefinitionForValidation,
  rawValue: unknown
): AttributeValueValidationResult {
  const rule = mergeValidationRule(
    parseValidationRule(definition.validationRule),
    definition.isMandatory
  );

  const value =
    isEmptyValue(rawValue) && definition.defaultValue
      ? definition.defaultValue
      : rawValue;

  if (rule.required && isEmptyValue(value)) {
    throw new ProductError(
      "INVALID_ATTRIBUTE_VALUE",
      `${definition.name} is required.`,
      400,
      definition.code
    );
  }

  if (isEmptyValue(value)) {
    return { normalizedValue: null, errors: [] };
  }

  const dataType = definition.dataType as AttributeDataType;
  let normalizedValue: unknown = value;

  switch (dataType) {
    case ATTRIBUTE_DATA_TYPES.BOOLEAN:
      normalizedValue =
        value === true ||
        value === "true" ||
        value === 1 ||
        value === "1";
      break;
    case ATTRIBUTE_DATA_TYPES.INTEGER:
    case ATTRIBUTE_DATA_TYPES.DECIMAL:
    case ATTRIBUTE_DATA_TYPES.CURRENCY:
    case ATTRIBUTE_DATA_TYPES.PERCENTAGE:
      normalizedValue = validateNumericType(value, dataType, rule);
      break;
    case ATTRIBUTE_DATA_TYPES.SELECT:
    case ATTRIBUTE_DATA_TYPES.RADIO:
      if (!dataTypeSupportsOptions(dataType)) {
        break;
      }
      normalizedValue = validateOptionValue(value, definition, false);
      break;
    case ATTRIBUTE_DATA_TYPES.MULTI_SELECT:
    case ATTRIBUTE_DATA_TYPES.CHECKBOX:
      normalizedValue = validateOptionValue(value, definition, true);
      break;
    case ATTRIBUTE_DATA_TYPES.JSON:
      if (typeof value === "string") {
        try {
          normalizedValue = JSON.parse(value);
        } catch {
          throw new ProductError(
            "INVALID_ATTRIBUTE_VALUE",
            "Value must be valid JSON.",
            400,
            definition.code
          );
        }
      }
      break;
    default:
      normalizedValue = validateStringType(value, rule, dataType);
      break;
  }

  return { normalizedValue, errors: [] };
}

export function validateAttributeValues(
  definitions: AttributeDefinitionForValidation[],
  values: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const definition of definitions) {
    if (definition.isReadOnly) {
      continue;
    }
    const result = validateAttributeValue(
      definition,
      values[definition.code]
    );
    normalized[definition.code] = result.normalizedValue;
  }

  return normalized;
}
