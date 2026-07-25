/**
 * Purpose:
 * Render a specific Business Setup Wizard step.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * BP-001 / IP-006 – Business Setup Wizard, Configuration & Activation
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
import { normalizeSetupStep } from "@/modules/business/onboarding/services/setup-rules";

type SetupStepPageProps = {
  params: Promise<{ step: string }>;
};

function isRoutableSetupStep(value: string): value is SetupStep {
  return SETUP_STEP_ORDER.includes(value as SetupStep);
}

export default async function SetupStepPage({ params }: SetupStepPageProps) {
  const { step: rawStep } = await params;

  // Legacy URLs (business-details, payment-methods, …) map to current steps.
  const normalized = normalizeSetupStep(rawStep);
  if (normalized && normalized !== rawStep && isRoutableSetupStep(normalized)) {
    redirect(`/setup/${normalized}`);
  }

  if (!isRoutableSetupStep(rawStep)) {
    notFound();
  }

  const progressResult = await getSetupProgressAction();
  const catalogResult = await getSetupCatalogAction();

  if (!progressResult.success || !catalogResult.success) {
    // No valid business context — return to Platform Home.
    redirect("/home");
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
  const classification = catalogResult.data.classification;

  return (
    <SetupWizard
      step={rawStep}
      progress={progressResult.data}
      countries={catalogResult.data.countries}
      currencies={catalogResult.data.currencies}
      industries={catalogResult.data.industries}
      businessTypes={catalogResult.data.businessTypes}
      businessCountryCode={catalogResult.data.businessCountryCode}
      defaultCurrencyCode={catalogResult.data.defaultCurrencyCode}
      allowBaseCurrencyChange={catalogResult.data.allowBaseCurrencyChange}
      businessName={catalogResult.data.businessName}
      classification={
        classification
          ? {
              industryId: classification.industryId,
              businessTypeId: classification.businessTypeId,
            }
          : null
      }
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
      branches={catalogResult.data.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        code: branch.code,
      }))}
      review={
        reviewResult?.success
          ? {
              tradingName: reviewResult.data.tradingName,
              industryName: reviewResult.data.industryName,
              businessTypeName: reviewResult.data.businessTypeName,
              email: reviewResult.data.email,
              physicalAddress: reviewResult.data.physicalAddress,
              county: reviewResult.data.county,
              city: reviewResult.data.city,
              countryName: reviewResult.data.countryName,
              baseCurrencyCode: reviewResult.data.baseCurrencyCode,
              additionalCurrencyCodes: reviewResult.data.additionalCurrencyCodes,
              branches: reviewResult.data.branches,
              employees: reviewResult.data.employees,
              paymentMethods: reviewResult.data.paymentMethods,
              receipt: reviewResult.data.receipt,
              aiAssistantEnabled: reviewResult.data.aiAssistantEnabled,
              loyaltyProgrammeEnabled:
                reviewResult.data.loyaltyProgrammeEnabled,
            }
          : null
      }
    />
  );
}
