/**
 * Purpose:
 * Render a specific Business Setup Wizard step.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

import { notFound, redirect } from "next/navigation";

import {
  getSetupCatalogAction,
  getSetupProgressAction,
  getSetupReviewAction,
} from "@/modules/business/onboarding/actions/setup-actions";
import { SetupWizard } from "@/modules/business/onboarding/components/setup-wizard";
import {
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  type SetupStep,
} from "@/modules/business/onboarding/constants";

type SetupStepPageProps = {
  params: Promise<{ step: string }>;
};

function isSetupStep(value: string): value is SetupStep {
  return SETUP_STEP_ORDER.includes(value as SetupStep);
}

export default async function SetupStepPage({ params }: SetupStepPageProps) {
  const { step: rawStep } = await params;

  if (!isSetupStep(rawStep)) {
    notFound();
  }

  const [progressResult, catalogResult] = await Promise.all([
    getSetupProgressAction(),
    getSetupCatalogAction(),
  ]);

  if (!progressResult.success || !catalogResult.success) {
    redirect("/select-business");
  }

  if (progressResult.data.isActivated) {
    redirect("/dashboard");
  }

  const reviewResult =
    rawStep === SETUP_STEPS.REVIEW
      ? await getSetupReviewAction()
      : null;

  const profile = catalogResult.data.profile;
  const configuration = catalogResult.data.configuration;

  return (
    <SetupWizard
      step={rawStep}
      progress={progressResult.data}
      countries={catalogResult.data.countries}
      currencies={catalogResult.data.currencies}
      businessCountryCode={catalogResult.data.businessCountryCode}
      defaultCurrencyCode={catalogResult.data.defaultCurrencyCode}
      businessName={catalogResult.data.businessName}
      profile={
        profile
          ? {
              tradingName: profile.tradingName,
              logoUrl: profile.logoUrl,
              email: profile.email,
              physicalAddress: profile.physicalAddress,
              county: profile.county,
              city: profile.city,
              website: profile.website,
              description: profile.description,
              gpsLatitude: profile.gpsLatitude
                ? String(profile.gpsLatitude)
                : null,
              gpsLongitude: profile.gpsLongitude
                ? String(profile.gpsLongitude)
                : null,
            }
          : null
      }
      configuration={configuration}
      operatingCurrencies={catalogResult.data.operatingCurrencies}
      review={
        reviewResult?.success
          ? {
              tradingName: reviewResult.data.tradingName,
              email: reviewResult.data.email,
              physicalAddress: reviewResult.data.physicalAddress,
              county: reviewResult.data.county,
              city: reviewResult.data.city,
              countryName: reviewResult.data.countryName,
              baseCurrencyCode: reviewResult.data.baseCurrencyCode,
              additionalCurrencyCodes: reviewResult.data.additionalCurrencyCodes,
              paymentMethods: reviewResult.data.paymentMethods,
              receipt: reviewResult.data.receipt,
              aiAssistantEnabled: reviewResult.data.aiAssistantEnabled,
              loyaltyProgrammeEnabled: reviewResult.data.loyaltyProgrammeEnabled,
            }
          : null
      }
    />
  );
}
