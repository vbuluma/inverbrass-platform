/**
 * UX-001.2 — Standard Platform Search Experience
 *
 * Four states: searching, empty, error, success (children).
 */

"use client";

import { Loader2Icon, SearchXIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export type PlatformSearchStateStatus =
  | "idle"
  | "searching"
  | "empty"
  | "error"
  | "success";

type PlatformSearchStateProps = {
  status: PlatformSearchStateStatus;
  /** Shown when status is empty */
  emptyTitle?: string;
  emptyHints?: string[];
  createLabel?: string;
  onCreate?: () => void;
  /** Shown when status is error */
  errorMessage?: string;
  onRetry?: () => void;
  /** Success content — search results */
  children?: ReactNode;
  compact?: boolean;
};

const DEFAULT_HINTS = [
  "Different keywords",
  "Removing filters",
  "Create a new record",
];

export function PlatformSearchState({
  status,
  emptyTitle = "No results found",
  emptyHints = DEFAULT_HINTS,
  createLabel = "Create New",
  onCreate,
  errorMessage = "Unable to complete search.",
  onRetry,
  children,
  compact = false,
}: PlatformSearchStateProps) {
  if (status === "idle") {
    return null;
  }

  if (status === "searching") {
    return (
      <div
        className={
          compact
            ? "flex items-center gap-2 py-3 text-sm text-muted-foreground"
            : "flex flex-col items-center gap-3 py-8 text-center"
        }
        role="status"
        aria-live="polite"
      >
        <Loader2Icon
          className={compact ? "size-4 animate-spin" : "size-6 animate-spin"}
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Searching…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={
          compact
            ? "space-y-2 py-3"
            : "flex flex-col items-center gap-3 py-8 text-center"
        }
        role="alert"
      >
        <p className="text-sm text-destructive">{errorMessage}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div
        className={
          compact
            ? "space-y-2 py-3"
            : "flex flex-col items-center gap-3 py-8 text-center"
        }
        role="status"
      >
        <SearchXIcon
          className={compact ? "size-5 text-muted-foreground" : "size-8 text-muted-foreground"}
          aria-hidden
        />
        <div className="space-y-2">
          <p className="text-sm font-medium">{emptyTitle}</p>
          <p className="text-xs text-muted-foreground">Try:</p>
          <ul className="text-xs text-muted-foreground">
            {emptyHints.map((hint) => (
              <li key={hint}>• {hint}</li>
            ))}
          </ul>
        </div>
        {onCreate ? (
          <Button type="button" size="sm" onClick={onCreate}>
            {createLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return <>{children}</>;
}
