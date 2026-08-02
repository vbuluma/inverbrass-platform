/**
 * UX-001 — Reusable clickable progress for multi-step / multi-page flows.
 *
 * Completed and upcoming steps are navigable when `onStepSelect` or `href` is
 * provided. The current step is marked with aria-current and is not clickable.
 */

"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

export type PlatformStepProgressStatus = "completed" | "current" | "upcoming";

export type PlatformStepProgressItem = {
  id: string;
  label: string;
  status: PlatformStepProgressStatus;
  href?: string;
};

type PlatformStepProgressProps = {
  steps: PlatformStepProgressItem[];
  progressPercent: number;
  currentStepLabel?: string;
  onStepSelect?: (stepId: string) => void;
  disabled?: boolean;
  className?: string;
  /** Hide the step list on small screens (progress bar + title still show). */
  compactBelowMd?: boolean;
};

function stepSymbol(status: PlatformStepProgressStatus): string {
  switch (status) {
    case "completed":
      return "✓";
    case "current":
      return "●";
    default:
      return "○";
  }
}

const stepLinkClassName = cn(
  "rounded-sm text-left transition-colors",
  "hover:text-foreground hover:underline",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
);

function PlatformStepProgressItem({
  step,
  onStepSelect,
  disabled,
}: {
  step: PlatformStepProgressItem;
  onStepSelect?: (stepId: string) => void;
  disabled?: boolean;
}) {
  const symbol = stepSymbol(step.status);
  const content = (
    <>
      {symbol} {step.label}
    </>
  );

  if (step.status === "current") {
    return (
      <li
        aria-current="step"
        className="font-medium text-foreground"
      >
        {content}
      </li>
    );
  }

  const isNavigable = Boolean(step.href || onStepSelect) && !disabled;

  if (!isNavigable) {
    return (
      <li
        className={
          step.status === "completed"
            ? "text-foreground/70"
            : "text-muted-foreground"
        }
      >
        {content}
      </li>
    );
  }

  if (step.href) {
    return (
      <li
        className={
          step.status === "completed"
            ? "text-foreground/70"
            : "text-muted-foreground"
        }
      >
        <Link href={step.href} prefetch={false} className={stepLinkClassName}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li
      className={
        step.status === "completed"
          ? "text-foreground/70"
          : "text-muted-foreground"
      }
    >
      <button
        type="button"
        className={stepLinkClassName}
        onClick={() => onStepSelect?.(step.id)}
      >
        {content}
      </button>
    </li>
  );
}

export function PlatformStepProgress({
  steps,
  progressPercent,
  currentStepLabel,
  onStepSelect,
  disabled = false,
  className,
  compactBelowMd = true,
}: PlatformStepProgressProps) {
  const resolvedCurrentLabel =
    currentStepLabel ??
    steps.find((step) => step.status === "current")?.label ??
    steps[0]?.label ??
    "Step";

  return (
    <nav
      aria-label="Progress"
      className={cn("space-y-3", className)}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{resolvedCurrentLabel}</span>
        <span className="text-muted-foreground">{progressPercent}% complete</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${resolvedCurrentLabel}: ${progressPercent}% complete`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <ol
        className={cn(
          "flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground",
          compactBelowMd && "hidden md:flex"
        )}
      >
        {steps.map((step) => (
          <PlatformStepProgressItem
            key={step.id}
            step={step}
            onStepSelect={onStepSelect}
            disabled={disabled}
          />
        ))}
      </ol>
    </nav>
  );
}
