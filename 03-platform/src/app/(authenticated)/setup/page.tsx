/**
 * Purpose:
 * Resume the Business Setup Wizard at the last incomplete step.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import { redirect } from "next/navigation";

import { getSetupProgressAction } from "@/modules/business/onboarding/actions/setup-actions";
import { SETUP_STEPS } from "@/modules/business/onboarding/constants";

export default async function SetupIndexPage() {
  const progressResult = await getSetupProgressAction();

  if (!progressResult.success) {
    // No valid business context — return to Platform Home (never switch with 0 businesses).
    redirect("/home");
  }

  if (progressResult.data.isActivated) {
    redirect("/dashboard");
  }

  const step =
    progressResult.data.resumeStep === SETUP_STEPS.COMPLETED
      ? SETUP_STEPS.REVIEW
      : progressResult.data.resumeStep;

  redirect(`/setup/${step}`);
}
