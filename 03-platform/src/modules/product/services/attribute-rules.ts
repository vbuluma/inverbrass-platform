/**
 * Purpose:
 * Pure business rules for Product Attributes Engine (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import {
  ATTRIBUTE_DATA_TYPES,
  ATTRIBUTE_DEFINITION_STATUS_CODES,
  ATTRIBUTE_GROUP_STATUS_CODES,
  type AttributeDataType,
} from "@/modules/product/constants";

export type AttributeValidationRule = {
  required?: boolean;
  unique?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  regex?: string | null;
  precision?: number | null;
};

export function normalizeAttributeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

export function normalizeAttributeGroupCode(code: string): string {
  return normalizeAttributeCode(code);
}

export function resolveDefaultAttributeGroupStatus(): string {
  return ATTRIBUTE_GROUP_STATUS_CODES.ACTIVE;
}

export function resolveDefaultAttributeDefinitionStatus(): string {
  return ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE;
}

export function attributeGroupStatusLabel(status: string): string {
  switch (status) {
    case ATTRIBUTE_GROUP_STATUS_CODES.ACTIVE:
      return "Active";
    case ATTRIBUTE_GROUP_STATUS_CODES.SUSPENDED:
      return "Suspended";
    case ATTRIBUTE_GROUP_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function attributeDefinitionStatusLabel(status: string): string {
  switch (status) {
    case ATTRIBUTE_DEFINITION_STATUS_CODES.DRAFT:
      return "Draft";
    case ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE:
      return "Active";
    case ATTRIBUTE_DEFINITION_STATUS_CODES.SUSPENDED:
      return "Suspended";
    case ATTRIBUTE_DEFINITION_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function attributeDataTypeLabel(dataType: string): string {
  switch (dataType) {
    case ATTRIBUTE_DATA_TYPES.TEXT:
      return "Text";
    case ATTRIBUTE_DATA_TYPES.LONG_TEXT:
      return "Long Text";
    case ATTRIBUTE_DATA_TYPES.INTEGER:
      return "Integer";
    case ATTRIBUTE_DATA_TYPES.DECIMAL:
      return "Decimal";
    case ATTRIBUTE_DATA_TYPES.CURRENCY:
      return "Currency";
    case ATTRIBUTE_DATA_TYPES.PERCENTAGE:
      return "Percentage";
    case ATTRIBUTE_DATA_TYPES.BOOLEAN:
      return "Boolean";
    case ATTRIBUTE_DATA_TYPES.DATE:
      return "Date";
    case ATTRIBUTE_DATA_TYPES.DATETIME:
      return "Date & Time";
    case ATTRIBUTE_DATA_TYPES.EMAIL:
      return "Email";
    case ATTRIBUTE_DATA_TYPES.PHONE:
      return "Phone";
    case ATTRIBUTE_DATA_TYPES.URL:
      return "URL";
    case ATTRIBUTE_DATA_TYPES.FILE:
      return "File";
    case ATTRIBUTE_DATA_TYPES.IMAGE:
      return "Image";
    case ATTRIBUTE_DATA_TYPES.JSON:
      return "JSON";
    case ATTRIBUTE_DATA_TYPES.SELECT:
      return "Dropdown";
    case ATTRIBUTE_DATA_TYPES.MULTI_SELECT:
      return "Multi-select";
    case ATTRIBUTE_DATA_TYPES.RADIO:
      return "Radio Button";
    case ATTRIBUTE_DATA_TYPES.CHECKBOX:
      return "Checkbox";
    default:
      return dataType;
  }
}

export function isValidAttributeDataType(dataType: string): dataType is AttributeDataType {
  return Object.values(ATTRIBUTE_DATA_TYPES).includes(dataType as AttributeDataType);
}

export function dataTypeSupportsOptions(dataType: string): boolean {
  return (
    dataType === ATTRIBUTE_DATA_TYPES.SELECT ||
    dataType === ATTRIBUTE_DATA_TYPES.MULTI_SELECT ||
    dataType === ATTRIBUTE_DATA_TYPES.RADIO ||
    dataType === ATTRIBUTE_DATA_TYPES.CHECKBOX
  );
}

export function isAttributeDefinitionEditable(status: string): boolean {
  return status !== ATTRIBUTE_DEFINITION_STATUS_CODES.ARCHIVED;
}

export function isAttributeDefinitionAssignable(status: string): boolean {
  return (
    status === ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE ||
    status === ATTRIBUTE_DEFINITION_STATUS_CODES.DRAFT
  );
}

export function canTransitionAttributeDefinitionStatus(
  current: string,
  next: string
): boolean {
  if (current === next) {
    return true;
  }
  if (current === ATTRIBUTE_DEFINITION_STATUS_CODES.ARCHIVED) {
    return false;
  }
  if (next === ATTRIBUTE_DEFINITION_STATUS_CODES.DRAFT) {
    return current === ATTRIBUTE_DEFINITION_STATUS_CODES.DRAFT;
  }
  return true;
}

export function canTransitionAttributeGroupStatus(
  current: string,
  next: string
): boolean {
  if (current === next) {
    return true;
  }
  if (current === ATTRIBUTE_GROUP_STATUS_CODES.ARCHIVED) {
    return false;
  }
  return true;
}

export function parseValidationRule(
  value: unknown
): AttributeValidationRule | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as AttributeValidationRule;
}

export function mergeValidationRule(
  rule: AttributeValidationRule | null | undefined,
  isMandatory: boolean
): AttributeValidationRule {
  return {
    ...(rule ?? {}),
    required: isMandatory || rule?.required === true,
  };
}
