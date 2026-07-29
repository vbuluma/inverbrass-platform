/**
 * UX-001 — Hook for consistent server action state management.
 */

"use client";

import { useCallback, useState, useTransition } from "react";

import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type {
  LegacyActionResult,
  PlatformActionLink,
  PlatformActionResult,
} from "@/core/platform/types";

type RunActionOptions<T> = {
  successTitle: string;
  successMessage: string;
  errorTitle?: string;
  nextActions?: PlatformActionLink[] | ((data: T) => PlatformActionLink[]);
  onSuccess?: (data: T) => void;
};

export function usePlatformAction() {
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const clearResult = useCallback(() => setResult(null), []);

  const runAction = useCallback(
    <T,>(
      action: () => Promise<LegacyActionResult<T>>,
      options: RunActionOptions<T>
    ) => {
      setResult(null);
      startTransition(async () => {
        const actionResult = await action();
        if (!actionResult.success) {
          setResult(
            platformError(
              options.errorTitle ?? "Action failed",
              actionResult.error.message,
              actionResult.error.field,
              [{ label: "Close", variant: "outline" }]
            )
          );
          return;
        }

        const nextActions =
          typeof options.nextActions === "function"
            ? options.nextActions(actionResult.data)
            : options.nextActions;

        setResult(
          platformSuccess(
            options.successTitle,
            options.successMessage,
            actionResult.data,
            nextActions
          )
        );
        options.onSuccess?.(actionResult.data);
      });
    },
    []
  );

  const setSimpleError = useCallback((message: string) => {
    setResult(platformError("Action failed", message));
  }, []);

  const setSimpleSuccess = useCallback((title: string, message = "") => {
    setResult(platformSuccess(title, message));
  }, []);

  return {
    result,
    isPending,
    clearResult,
    runAction,
    setSimpleError,
    setSimpleSuccess,
    setResult,
  };
}
