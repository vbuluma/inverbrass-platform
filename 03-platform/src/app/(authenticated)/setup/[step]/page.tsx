/**
 * Purpose:
 * Render a specific Business Setup Wizard step.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * BP-001 / IP-006 – Business Setup Wizard, Configuration & Activation
 *
 * Manage mode (`?manage=1`) reuses the same step forms for Business Settings
 * after activation — no duplicate settings screens.
 */

import { notFound, redirect } from "next/navigation";

import {
  getSetupCatalogAction,
  getSetupProgressAction,
  getSetupReviewAction,
} from "@/modules/business/onboarding/actions/setup-actions";
import { SetupWizard } from "@/modules/business/onboarding/components/setup-wizard";
import {
  SETUP_ALLOW_BASE_CURRENCY_CHANGE,
  SETUP_STEP_ORDER,
  SETUP_STEPS,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import { normalizeSetupStep } from "@/modules/business/onboarding/services/setup-rules";

type SetupStepPageProps = {
  params: Promise<{ step: string }>;
  searchParams: Promise<{ manage?: string }>;
};

/** Redirect to Platform Home only for session / business-context failures. */
const UNRECOVERABLE_SETUP_CODES = new Set([
  "SESSION_REQUIRED",
  "BUSINESS_CONTEXT_REQUIRED",
  "NO_BUSINESS_ACCESS",
]);

function isRoutableSetupStep(value: string): value is SetupStep {
  return SETUP_STEP_ORDER.includes(value as SetupStep);
}

function isUnrecoverableSetupFailure(result: {
  success: boolean;
  error?: { code: string; message: string };
}): boolean {
  return (
    !result.success &&
    !!result.error &&
    UNRECOVERABLE_SETUP_CODES.has(result.error.code)
  );
}

export default async function SetupStepPage({
  params,
  searchParams,
}: SetupStepPageProps) {
  const { step: rawStep } = await params;
  const query = await searchParams;
  const manageMode = query.manage === "1";

  // Legacy URLs (business-details, payment-methods, …) map to current steps.
  const normalized = normalizeSetupStep(rawStep);
  if (normalized && normalized !== rawStep && isRoutableSetupStep(normalized)) {
    redirect(
      manageMode ? `/setup/${normalized}?manage=1` : `/setup/${normalized}`
    );
  }

  if (!isRoutableSetupStep(rawStep)) {
    notFound();
  }

  const progressResult = await getSetupProgressAction();
  const catalogResult = await getSetupCatalogAction();

  if (!progressResult.success || !catalogResult.success) {
    console.error({
      progressResult,
      catalogResult,
    });
  }

  // Progress is required to drive the wizard. Auth/context failures → home.
  if (!progressResult.success) {
    if (isUnrecoverableSetupFailure(progressResult)) {
      redirect("/home");
    }
    // Non-auth progress failure: still cannot render steps without progress.
    console.error(
      "[setup.step] progress failed (non-auth); returning to Platform Home",
      progressResult
    );
    redirect("/home");
  }

  // Catalog: only bounce home for missing session/business context.
  // Optional slices (branches, config, currencies, …) use defaults in the action.
  if (!catalogResult.success) {
    if (isUnrecoverableSetupFailure(catalogResult)) {
      redirect("/home");
    }
    console.error(
      "[setup.step] catalog failed but continuing with empty defaults",
      catalogResult
    );
  }

  if (progressResult.data.isActivated && !manageMode) {
    redirect("/dashboard");
  }

  // Welcome / Review belong to first-time activation, not Settings maintenance.
  if (
    manageMode &&
    (rawStep === SETUP_STEPS.WELCOME || rawStep === SETUP_STEPS.REVIEW)
  ) {
    redirect("/settings");
  }

  const reviewResult =
    rawStep === SETUP_STEPS.REVIEW
      ? await getSetupReviewAction()
      : null;

  const catalog = catalogResult.success
    ? catalogResult.data
    : {
        countries: [],
        currencies: [],
        industries: [],
        businessTypes: [],
        businessCountryCode: "",
        defaultCurrencyCode: null,
        allowBaseCurrencyChange: SETUP_ALLOW_BASE_CURRENCY_CHANGE,
        profile: null,
        classification: null,
        configuration: null,
        operatingCurrencies: [],
        branches: [],
        businessName: progressResult.data.businessName,
      };

  const profile = catalog.profile;
  const configuration = catalog.configuration;
  const classification = catalog.classification;

  return (
    <SetupWizard
      step={rawStep}
      manageMode={manageMode}
      progress={progressResult.data}
      countries={catalog.countries}
      currencies={catalog.currencies}
      industries={catalog.industries}
      businessTypes={catalog.businessTypes}
      businessCountryCode={catalog.businessCountryCode}
      defaultCurrencyCode={catalog.defaultCurrencyCode}
      allowBaseCurrencyChange={catalog.allowBaseCurrencyChange}
      businessName={catalog.businessName}
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
      operatingCurrencies={catalog.operatingCurrencies}
      branches={catalog.branches.map((branch) => ({
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
