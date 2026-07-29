/**
 * UX-001.1g — Standard workspace header layout.
 */

"use client";

import type { ReactNode } from "react";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformCompletionMeter, type CompletionItem } from "@/components/platform/platform-completion-meter";
import { PlatformInlineFormFeedback } from "@/components/platform/platform-form-action-footer";
import { PlatformQuickActionsCard } from "@/components/platform/platform-quick-actions-card";
import type { PlatformActionLink, PlatformActionResult } from "@/core/platform/types";

type PlatformWorkspaceHeaderProps = {
  backHref: string;
  backLabel: string;
  workspaceLabel: string;
  title: string;
  subtitle?: string;
  statusLabel?: string;
  createdLabel?: string;
  completionItems?: CompletionItem[];
  quickActions?: PlatformActionLink[];
  primaryActions?: ReactNode;
  headerResult?: PlatformActionResult | null;
  isProcessing?: boolean;
  processingLabel?: string;
  onDismissHeaderResult?: () => void;
  favoriteControl?: ReactNode;
};

export function PlatformWorkspaceHeader({
  backHref,
  backLabel,
  workspaceLabel,
  title,
  subtitle,
  statusLabel,
  createdLabel,
  completionItems,
  quickActions,
  primaryActions,
  headerResult,
  isProcessing,
  processingLabel,
  onDismissHeaderResult,
  favoriteControl,
}: PlatformWorkspaceHeaderProps) {
  return (
    <div className="space-y-4">
      <PageBackLink href={backHref} label={backLabel} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {workspaceLabel}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {favoriteControl}
              </div>
              {subtitle ? (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {statusLabel ? <span>Status: {statusLabel}</span> : null}
                {createdLabel ? <span>Created: {createdLabel}</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          {primaryActions ? (
            <div className="flex flex-wrap gap-2">{primaryActions}</div>
          ) : null}
          <PlatformInlineFormFeedback
            result={headerResult ?? null}
            isProcessing={isProcessing}
            processingLabel={processingLabel}
            onDismiss={onDismissHeaderResult}
          />
        </div>
      </div>

      {(completionItems?.length || quickActions?.length) ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
          {completionItems?.length ? (
            <PlatformCompletionMeter items={completionItems} />
          ) : null}
          {quickActions?.length ? (
            <PlatformQuickActionsCard actions={quickActions} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
