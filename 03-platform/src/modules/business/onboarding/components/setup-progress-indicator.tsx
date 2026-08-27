/**
 * Purpose:
 * Render sticky setup progress for the Business Setup Wizard.
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

"use client";

import {
  PlatformStepProgress,
  type PlatformStepProgressItem,
} from "@/components/platform/platform-step-progress";
import {
  SETUP_STEP_LABELS,
  SETUP_STEP_ORDER,
  type SetupStep,
} from "@/modules/business/onboarding/constants";

type SetupProgressIndicatorProps = {
  currentStep: SetupStep;
  completedSteps: SetupStep[];
  progressPercent: number;
  onStepSelect?: (step: SetupStep) => void;
  disabled?: boolean;
};

function toProgressItem(
  step: SetupStep,
  currentStep: SetupStep,
  completedSteps: SetupStep[]
): PlatformStepProgressItem {
  const done = completedSteps.includes(step);
  const active = step === currentStep;

  return {
    id: step,
    label: SETUP_STEP_LABELS[step],
    status: active ? "current" : done ? "completed" : "upcoming",
  };
}

export function SetupProgressIndicator({
  currentStep,
  completedSteps,
  progressPercent,
  onStepSelect,
  disabled = false,
}: SetupProgressIndicatorProps) {
  const steps = SETUP_STEP_ORDER.map((step) =>
    toProgressItem(step, currentStep, completedSteps)
  );

  return (
    <PlatformStepProgress
      steps={steps}
      progressPercent={progressPercent}
      currentStepLabel={SETUP_STEP_LABELS[currentStep]}
      disabled={disabled}
      onStepSelect={
        onStepSelect
          ? (stepId) => onStepSelect(stepId as SetupStep)
          : undefined
      }
    />
  );
}
