/**
 * UX-001j — Local form draft persistence so users can resume later.
 */

"use client";

import { useCallback, useState } from "react";

type DraftEnvelope<T> = {
  savedAt: string;
  values: T;
};

function readDraft<T>(storageKey: string): DraftEnvelope<T> | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as DraftEnvelope<T>;
  } catch {
    return null;
  }
}

export function useFormDraft<T extends Record<string, unknown>>(
  storageKey: string
) {
  const [draft, setDraft] = useState<DraftEnvelope<T> | null>(() =>
    typeof window === "undefined" ? null : readDraft<T>(storageKey)
  );
  const isHydrated = typeof window !== "undefined";

  const saveDraft = useCallback(
    (values: T) => {
      const envelope: DraftEnvelope<T> = {
        savedAt: new Date().toISOString(),
        values,
      };
      window.localStorage.setItem(storageKey, JSON.stringify(envelope));
      setDraft(envelope);
    },
    [storageKey]
  );

  const clearDraft = useCallback(() => {
    window.localStorage.removeItem(storageKey);
    setDraft(null);
  }, [storageKey]);

  const hasDraft = draft !== null;

  return {
    draft,
    draftValues: draft?.values ?? null,
    draftSavedAt: draft?.savedAt ?? null,
    hasDraft,
    isHydrated,
    saveDraft,
    clearDraft,
  };
}

export function formatDraftSavedAt(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  formData.forEach((value, key) => {
    record[key] = String(value);
  });
  return record;
}

export function readFormValues(form: HTMLFormElement): Record<string, string> {
  return formDataToRecord(new FormData(form));
}
