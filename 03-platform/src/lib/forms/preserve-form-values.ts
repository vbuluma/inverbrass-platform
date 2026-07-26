/**
 * Purpose:
 * Platform UX standard — never discard valid user input after validation failure.
 *
 * Design rationale:
 * React 19 / Next.js form actions reset the DOM form when an action completes
 * without throwing. Returning `{ success: false }` still counts as completion,
 * so uncontrolled defaultValue/defaultChecked fields are wiped. Capture values
 * into React state before the round-trip and re-bind them after failure.
 *
 * Applies to:
 * Business Setup, Platform Registration, Business Creation, Profile Management,
 * and future BP forms.
 *
 * Principle:
 * Never discard valid user input because another field failed validation.
 */

"use client";

import { useCallback, useRef, useState } from "react";

export type PreservedFormValues = Record<string, string | boolean>;

type UsePreservedFormValuesOptions = {
  /** Initial values (usually from server props / defaults). */
  initial: PreservedFormValues;
  /** Checkbox field names — absent FormData keys become false. */
  checkboxFields?: string[];
};

/**
 * WHAT: Capture FormData into a plain values map (strings + checkboxes).
 * WHY: Shared by the hook and by one-off submit handlers.
 */
export function captureFormValues(
  formData: FormData,
  options: {
    keys: string[];
    checkboxFields?: string[];
  }
): PreservedFormValues {
  const checkboxFields = new Set(options.checkboxFields ?? []);
  const next: PreservedFormValues = {};

  for (const key of options.keys) {
    if (checkboxFields.has(key)) {
      next[key] = formData.get(key) === "on";
    } else {
      const value = formData.get(key);
      next[key] = typeof value === "string" ? value : "";
    }
  }

  return next;
}

/**
 * WHAT: Hold form values across failed validation submissions.
 * WHY: Remount via formKey + defaultValue/defaultChecked from preserved state.
 */
export function usePreservedFormValues({
  initial,
  checkboxFields = [],
}: UsePreservedFormValuesOptions) {
  const [values, setValues] = useState<PreservedFormValues>(initial);
  const [formKey, setFormKey] = useState(0);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const keysRef = useRef(Object.keys(initial));
  const checkboxFieldsRef = useRef(checkboxFields);
  checkboxFieldsRef.current = checkboxFields;

  const recoverAfterValidationFailure = useCallback(
    (formData: FormData, field?: string | null) => {
      setValues(
        captureFormValues(formData, {
          keys: keysRef.current,
          checkboxFields: checkboxFieldsRef.current,
        })
      );
      setInvalidField(field ?? null);
      setFormKey((current) => current + 1);
    },
    []
  );

  const clearInvalidField = useCallback(() => {
    setInvalidField(null);
  }, []);

  function textValue(name: string): string {
    const value = values[name];
    return typeof value === "string" ? value : "";
  }

  function checkedValue(name: string): boolean {
    return values[name] === true;
  }

  function fieldClassName(name: string, base = ""): string {
    if (invalidField !== name) {
      return base;
    }
    return [base, "border-destructive ring-2 ring-destructive/30"]
      .filter(Boolean)
      .join(" ");
  }

  return {
    values,
    setValues,
    formKey,
    invalidField,
    textValue,
    checkedValue,
    fieldClassName,
    recoverAfterValidationFailure,
    clearInvalidField,
  };
}
