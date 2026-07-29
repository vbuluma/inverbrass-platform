/**
 * UX-001 — Shared feedback patterns for workspace tab panels.
 */

"use client";

import { useCallback, useState, useTransition } from "react";

import {
  PlatformActionResultDisplay,
  PlatformConfirmDialogHost,
  useConfirmAction,
} from "@/components/platform";
import { PlatformInlineFormFeedback } from "@/components/platform/platform-form-action-footer";
import { platformError, platformSuccess } from "@/core/platform/platform-action-helpers";
import type {
  LegacyActionResult,
  PlatformActionLink,
  PlatformActionResult,
} from "@/core/platform/types";

type ApplyPanelResultOptions<T> = {
  successTitle: string;
  successMessage: string;
  nextActions?: PlatformActionLink[] | ((data: T) => PlatformActionLink[]);
  onSuccess?: (data: T) => void;
};

export function usePanelFeedback<T>() {
  const [result, setResult] = useState<PlatformActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const { requestConfirm, confirmDialogProps } = useConfirmAction();

  const clearResult = useCallback(() => setResult(null), []);

  const applyPanelResult = useCallback(
    (
      actionResult: LegacyActionResult<T>,
      options: ApplyPanelResultOptions<T>
    ) => {
      if (!actionResult.success) {
        setResult(
          platformError("Action failed", actionResult.error.message, actionResult.error.field)
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
    },
    []
  );

  const runPanelAction = useCallback(
    (
      action: () => Promise<LegacyActionResult<T>>,
      options: ApplyPanelResultOptions<T>
    ) => {
      clearResult();
      startTransition(async () => {
        const actionResult = await action();
        applyPanelResult(actionResult, options);
      });
    },
    [applyPanelResult, clearResult]
  );

  const setValidationError = useCallback((message: string) => {
    setResult(platformError("Validation failed", message));
  }, []);

  function ConfirmDialogHost() {
    return <PlatformConfirmDialogHost props={confirmDialogProps()} />;
  }

  function FormFeedback({
    processingLabel,
    draftSavedAt,
  }: {
    processingLabel?: string;
    draftSavedAt?: string | null;
  }) {
    return (
      <PlatformInlineFormFeedback
        result={result}
        isProcessing={isPending}
        processingLabel={processingLabel}
        onDismiss={clearResult}
        draftSavedAt={draftSavedAt}
      />
    );
  }

  /** @deprecated Prefer FormFeedback below the form action buttons. */
  function PanelFeedback() {
    return (
      <>
        <PlatformActionResultDisplay result={result} onDismiss={clearResult} />
        <ConfirmDialogHost />
      </>
    );
  }

  return {
    result,
    isPending,
    clearResult,
    applyPanelResult,
    runPanelAction,
    setValidationError,
    requestConfirm,
    PanelFeedback,
    FormFeedback,
    ConfirmDialogHost,
  };
}
