/**
 * UX-001 — Helpers for constructing and adapting PlatformActionResult envelopes.
 */

import type {
  LegacyActionResult,
  PlatformActionLink,
  PlatformActionResult,
  PlatformActionSeverity,
} from "@/core/platform/types";

export function platformSuccess<T>(
  title: string,
  message: string,
  data?: T,
  nextActions?: PlatformActionLink[],
  options?: {
    summary?: Array<{ label: string; value: string }>;
    completionTitle?: string;
  }
): PlatformActionResult<T> {
  return {
    success: true,
    severity: "success",
    title,
    message,
    data,
    nextActions,
    summary: options?.summary,
    completionTitle: options?.completionTitle,
  };
}

export function platformWarning<T>(
  title: string,
  message: string,
  data?: T,
  nextActions?: PlatformActionLink[]
): PlatformActionResult<T> {
  return {
    success: true,
    severity: "warning",
    title,
    message,
    data,
    nextActions,
  };
}

export function platformError(
  title: string,
  message: string,
  field?: string,
  nextActions?: PlatformActionLink[]
): PlatformActionResult<never> {
  return {
    success: false,
    severity: "error",
    title,
    message,
    field,
    nextActions,
  };
}

export function adaptLegacyResult<T>(
  result: LegacyActionResult<T>,
  options: {
    successTitle: string;
    successMessage: string;
    errorTitle?: string;
    nextActions?: PlatformActionLink[];
    warning?: (data: T) => PlatformActionResult<T> | null;
  }
): PlatformActionResult<T> {
  if (!result.success) {
    return platformError(
      options.errorTitle ?? "Action failed",
      result.error.message,
      result.error.field,
      [{ label: "Close", variant: "outline" }]
    );
  }

  const warningResult = options.warning?.(result.data);
  if (warningResult) {
    return warningResult;
  }

  return platformSuccess(
    options.successTitle,
    options.successMessage,
    result.data,
    options.nextActions
  );
}

export function severityToAlertVariant(
  severity: PlatformActionSeverity
): "default" | "destructive" | "success" {
  switch (severity) {
    case "success":
      return "success";
    case "warning":
      return "default";
    case "error":
      return "destructive";
  }
}
