/**
 * UX-001b/c/i — Action bar + inline processing + result feedback below the form.
 */

"use client";

import { PlatformActionResultDisplay } from "@/components/platform/platform-action-result";
import {
  PlatformProcessingIndicator,
  type PROCESSING_LABELS,
} from "@/components/platform/platform-processing-button";
import { PlatformStickyActionBar } from "@/components/platform/platform-sticky-action-bar";
import { formatDraftSavedAt } from "@/components/platform/use-form-draft";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";

type PlatformInlineFormFeedbackProps = {
  result?: PlatformActionResult | null;
  isProcessing?: boolean;
  processingLabel?: string;
  onDismiss?: () => void;
  draftSavedAt?: string | null;
  className?: string;
};

export function PlatformInlineFormFeedback({
  result = null,
  isProcessing = false,
  processingLabel,
  onDismiss,
  draftSavedAt = null,
  className,
}: PlatformInlineFormFeedbackProps) {
  const formattedDraftTime = formatDraftSavedAt(draftSavedAt);

  return (
    <div className={cn("space-y-3", className)}>
      {isProcessing && processingLabel ? (
        <PlatformProcessingIndicator
          isProcessing={isProcessing}
          label={processingLabel}
          className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/40"
        />
      ) : null}

      <PlatformActionResultDisplay result={result} onDismiss={onDismiss} />

      {formattedDraftTime ? (
        <p className="text-xs text-muted-foreground">
          Draft saved {formattedDraftTime}. You can leave and resume later.
        </p>
      ) : null}
    </div>
  );
}

type PlatformFormActionFooterProps = PlatformInlineFormFeedbackProps & {
  children: React.ReactNode;
};

export function PlatformFormActionFooter({
  children,
  result = null,
  isProcessing = false,
  processingLabel,
  onDismiss,
  draftSavedAt = null,
  className,
}: PlatformFormActionFooterProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <PlatformStickyActionBar>{children}</PlatformStickyActionBar>
      <PlatformInlineFormFeedback
        result={result}
        isProcessing={isProcessing}
        processingLabel={processingLabel}
        onDismiss={onDismiss}
        draftSavedAt={draftSavedAt}
      />
    </div>
  );
}

export type ProcessingLabelKey = keyof typeof PROCESSING_LABELS;
