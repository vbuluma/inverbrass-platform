/**
 * UX-001b — Standard action result feedback with guided next steps.
 */

"use client";

import Link from "next/link";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlatformCompletionCard } from "@/components/platform/platform-completion-card";
import { severityToAlertVariant } from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { cn } from "@/lib/utils";

type PlatformActionResultDisplayProps = {
  result: PlatformActionResult | null;
  onDismiss?: () => void;
  className?: string;
};

function SeverityIcon({
  severity,
}: {
  severity: PlatformActionResult["severity"];
}) {
  switch (severity) {
    case "success":
      return <CheckCircle2Icon aria-hidden />;
    case "warning":
      return <AlertTriangleIcon aria-hidden />;
    case "error":
      return <AlertCircleIcon aria-hidden />;
  }
}

export function PlatformActionResultDisplay({
  result,
  onDismiss,
  className,
}: PlatformActionResultDisplayProps) {
  if (!result) {
    return null;
  }

  const hasSummary = (result.summary?.length ?? 0) > 0;
  const hasNextActions = (result.nextActions?.length ?? 0) > 0;

  if (result.success && hasSummary) {
    return (
      <PlatformCompletionCard
        title={result.completionTitle ?? result.title}
        summary={result.summary!}
        nextActions={result.nextActions}
        className={className}
      />
    );
  }

  return (
    <Alert
      variant={severityToAlertVariant(result.severity)}
      className={className}
    >
      <SeverityIcon severity={result.severity} />
      <AlertDescription>
        <p className="font-medium">{result.title}</p>
        {result.message ? <p className="mt-1">{result.message}</p> : null}
        {hasNextActions ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next Steps
            </p>
            <div className="flex flex-wrap gap-2">
              {result.nextActions!.map((action) => {
                const variant = action.variant ?? "default";
                if (action.href) {
                  return (
                    <Link
                      key={action.label}
                      href={action.href}
                      prefetch={false}
                      className={cn(buttonVariants({ variant, size: "sm" }))}
                    >
                      {action.label}
                    </Link>
                  );
                }
                return (
                  <Button
                    key={action.label}
                    type="button"
                    size="sm"
                    variant={variant}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
        {!hasNextActions && onDismiss ? (
          <div className="mt-3">
            <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
              Close
            </Button>
          </div>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Build a simple result from a legacy success/error message pair.
 */
export function toSimpleResult(
  error: string | null,
  message: string | null
): PlatformActionResult | null {
  if (error) {
    return {
      success: false,
      severity: "error",
      title: "Action failed",
      message: error,
      nextActions: [{ label: "Close", variant: "outline" }],
    };
  }
  if (message) {
    return {
      success: true,
      severity: "success",
      title: message,
      message: "",
    };
  }
  return null;
}
