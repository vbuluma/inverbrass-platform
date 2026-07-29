/**
 * Platform Form Standard — controlled form state hook.
 *
 * Use for workspace panels, registration flows, and any form that needs
 * draft loading, async hydration, or reset after save.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ControlledFormValues = Record<string, string | boolean>;

type UseControlledFormOptions<T extends ControlledFormValues> = {
  initial: T;
  /** Optional draft values loaded async — applied once when hydrated. */
  draft?: Partial<T> | null;
  /** Whether draft hydration has completed. */
  draftHydrated?: boolean;
};

export function useControlledForm<T extends ControlledFormValues>({
  initial,
  draft,
  draftHydrated = true,
}: UseControlledFormOptions<T>) {
  const [values, setValues] = useState<T>(() => ({
    ...initial,
    ...(draft ?? {}),
  }));
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const draftAppliedRef = useRef(false);

  useEffect(() => {
    if (!draftHydrated || !draft || draftAppliedRef.current) {
      return;
    }
    setValues((current) => ({ ...current, ...draft }));
    draftAppliedRef.current = true;
  }, [draft, draftHydrated]);

  const setField = useCallback(<K extends keyof T>(name: K, value: T[K]) => {
    setValues((current) => ({ ...current, [name]: value }));
    setInvalidField((current) => (current === name ? null : current));
  }, []);

  const setFields = useCallback((patch: Partial<T>) => {
    setValues((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback((next?: T) => {
    setValues(next ?? initial);
    setInvalidField(null);
  }, [initial]);

  const recoverFromFormData = useCallback(
    (formData: FormData, keys: (keyof T)[], field?: string | null) => {
      const next = { ...values };
      for (const key of keys) {
        const name = String(key);
        const raw = formData.get(name);
        if (typeof next[key] === "boolean") {
          (next as Record<string, string | boolean>)[name] = raw === "on" || raw === "true";
        } else {
          (next as Record<string, string | boolean>)[name] =
            typeof raw === "string" ? raw : "";
        }
      }
      setValues(next);
      setInvalidField(field ?? null);
    },
    [values]
  );

  function textValue(name: keyof T): string {
    const value = values[name];
    return typeof value === "string" ? value : "";
  }

  function checkedValue(name: keyof T): boolean {
    return values[name] === true;
  }

  function fieldClassName(name: keyof T, base = ""): string {
    if (invalidField !== String(name)) {
      return base;
    }
    return [base, "border-destructive ring-2 ring-destructive/30"]
      .filter(Boolean)
      .join(" ");
  }

  return {
    values,
    setValues,
    setField,
    setFields,
    reset,
    invalidField,
    setInvalidField,
    textValue,
    checkedValue,
    fieldClassName,
    recoverFromFormData,
  };
}
