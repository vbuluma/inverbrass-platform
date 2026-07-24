/**
 * Purpose:
 * Render sticky setup progress for the Business Setup Wizard.
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import {
  SETUP_STEP_LABELS,
  SETUP_STEP_ORDER,
  type SetupStep,
} from "@/modules/business/onboarding/constants";

type SetupProgressIndicatorProps = {
  currentStep: SetupStep;
  completedSteps: SetupStep[];
  progressPercent: number;
};

export function SetupProgressIndicator({
  currentStep,
  completedSteps,
  progressPercent,
}: SetupProgressIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {SETUP_STEP_LABELS[currentStep]}
        </span>
        <span className="text-muted-foreground">{progressPercent}% complete</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <ol className="hidden gap-1 text-xs text-muted-foreground md:flex md:flex-wrap">
        {SETUP_STEP_ORDER.map((step) => {
          const done = completedSteps.includes(step);
          const active = step === currentStep;

          return (
            <li
              key={step}
              className={
                active
                  ? "font-medium text-foreground"
                  : done
                    ? "text-foreground/70"
                    : undefined
              }
            >
              {done ? "✓ " : active ? "● " : "○ "}
              {SETUP_STEP_LABELS[step]}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
