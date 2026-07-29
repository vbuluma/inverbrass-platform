/**
 * Platform Form Standard — consistent empty values for controlled inputs.
 *
 * Every field must initialize with these defaults and never switch between
 * controlled and uncontrolled after mount.
 */

export const EMPTY_TEXT = "";
export const EMPTY_NUMBER: number | null = null;
export const EMPTY_BOOLEAN = false;
/** Native / custom selects — undefined means "no selection". */
export const EMPTY_SELECT: string | undefined = undefined;
export const EMPTY_DATE: string | null = null;

export type FormFieldKind = "text" | "number" | "boolean" | "select" | "date";

export function emptyValueFor(kind: FormFieldKind): string | number | boolean | null | undefined {
  switch (kind) {
    case "text":
      return EMPTY_TEXT;
    case "number":
      return EMPTY_NUMBER;
    case "boolean":
      return EMPTY_BOOLEAN;
    case "select":
      return EMPTY_SELECT;
    case "date":
      return EMPTY_DATE;
  }
}

/** Coerce nullable server values to controlled text input value. */
export function textFieldValue(value: string | null | undefined): string {
  return value ?? EMPTY_TEXT;
}

/** Coerce nullable server values to controlled select value. */
export function selectFieldValue(value: string | null | undefined): string {
  return value ?? EMPTY_TEXT;
}

/** Coerce nullable server values to controlled date input value (YYYY-MM-DD). */
export function dateFieldValue(value: string | null | undefined): string {
  return value ?? EMPTY_TEXT;
}

/** Coerce nullable server values to controlled checkbox checked state. */
export function booleanFieldValue(value: boolean | null | undefined): boolean {
  return value ?? EMPTY_BOOLEAN;
}
