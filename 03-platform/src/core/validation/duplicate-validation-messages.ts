/**
 * ENG-003j — Friendly duplicate-value validation messages.
 *
 * Returns human-readable copy that includes the conflicting value.
 */

export type DuplicateEntityLabel =
  | "Employee"
  | "Business"
  | "Branch"
  | "Product"
  | "Customer"
  | "Supplier"
  | "Party"
  | "Group"
  | "Record"
  | (string & {});

export function formatDynamicDuplicateValueMessage(
  fieldLabel: string,
  value: string,
  entityLabel: string
): string {
  return `${entityLabel} with ${fieldLabel} ${value.trim()} already exists.`;
}

export type DuplicateFieldLabel =
  | "mobile number"
  | "email"
  | "business registration number"
  | "product code"
  | "branch code"
  | "group code"
  | "identifier"
  | string;

export function formatDuplicateValueMessage(
  fieldLabel: DuplicateFieldLabel,
  value: string,
  entityLabel: DuplicateEntityLabel = "Record"
): string {
  const trimmed = value.trim();
  return `${entityLabel} with ${fieldLabel} ${trimmed} already exists.`;
}

export function formatDuplicateValueTitle(
  fieldLabel: DuplicateFieldLabel
): string {
  return `${fieldLabel.charAt(0).toUpperCase()}${fieldLabel.slice(1)} already exists`;
}
