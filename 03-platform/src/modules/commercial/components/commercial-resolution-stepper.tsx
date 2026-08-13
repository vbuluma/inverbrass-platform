/**
 * Purpose:
 * Progressive workflow stepper for commercial resolution (UX §14).
 *
 * Implementation Package:
 * BP-005 / IP-01–IP-03 – Commercial Resolution UX
 */

"use client";

import { CheckIcon, CircleAlertIcon, LockIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type CommercialStepId =
  | "base-price"
  | "components"
  | "tax"
  | "review";

export type CommercialStepStatus =
  | "current"
  | "complete"
  | "incomplete"
  | "error"
  | "locked";

export type CommercialStepDefinition = {
  id: CommercialStepId;
  label: string;
  shortLabel: string;
  status: CommercialStepStatus;
};

type CommercialResolutionStepperProps = {
  steps: CommercialStepDefinition[];
  activeStep: CommercialStepId;
  onStepSelect: (stepId: CommercialStepId) => void;
};

export function CommercialResolutionStepper({
  steps,
  activeStep,
  onStepSelect,
}: CommercialResolutionStepperProps) {
  return (
    <nav aria-label="Commercial resolution progress" className="w-full">
      <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
        {steps.map((step, index) => {
          const isCurrent = step.id === activeStep;
          const disabled = step.status === "locked";
          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={disabled}
                aria-current={isCurrent ? "step" : undefined}
                aria-disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    onStepSelect(step.id);
                  }
                }}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isCurrent &&
                    "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200",
                  step.status === "complete" &&
                    !isCurrent &&
                    "border-emerald-200 bg-white",
                  step.status === "error" &&
                    "border-destructive/50 bg-destructive/5",
                  step.status === "locked" &&
                    "cursor-not-allowed border-muted bg-muted/40 opacity-70",
                  step.status === "incomplete" &&
                    !isCurrent &&
                    "border-border bg-background hover:bg-muted/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.status === "complete" &&
                      "bg-emerald-600 text-white",
                    step.status === "current" &&
                      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300",
                    step.status === "error" &&
                      "bg-destructive text-destructive-foreground",
                    step.status === "locked" &&
                      "bg-muted text-muted-foreground",
                    step.status === "incomplete" &&
                      "bg-muted text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {step.status === "complete" ? (
                    <CheckIcon className="size-3.5" />
                  ) : step.status === "error" ? (
                    <CircleAlertIcon className="size-3.5" />
                  ) : step.status === "locked" ? (
                    <LockIcon className="size-3.5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {step.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {statusLabel(step.status)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function statusLabel(status: CommercialStepStatus): string {
  switch (status) {
    case "current":
      return "Current step";
    case "complete":
      return "Complete";
    case "error":
      return "Needs attention";
    case "locked":
      return "Not yet available";
    default:
      return "Incomplete";
  }
}
