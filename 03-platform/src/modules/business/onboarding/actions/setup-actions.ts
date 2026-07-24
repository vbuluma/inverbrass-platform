"use server";

/**
 * Purpose:
 * Expose Business Setup Wizard server actions to the App Router UI.
 *
 * Business Context:
 * Setup pages delegate orchestration to BusinessSetupService while preserving
 * the standardized action result envelope used across platform modules.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (A4)
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 *
 * Responsibilities:
 * - Authenticate session and resolve business context
 * - Invoke BusinessSetupService operations
 * - Redirect after activation
 *
 * Non-Responsibilities:
 * - Business rule enforcement (BusinessSetupService)
 * - Direct database access
 *
 * Dependencies:
 * - AuthService, BusinessContextService, BusinessSetupService
 *
 * Business Rules Implemented:
 * - IP-006 wizard step persistence and activation entry points
 *
 * Extension Points:
 * - Additional setup steps may add thin action wrappers here
 */

import { redirect } from "next/navigation";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import type { SetupStep } from "@/modules/business/onboarding/constants";
import { SetupError } from "@/modules/business/onboarding/errors";
import { createBusinessSetupService } from "@/modules/business/onboarding/services/business-setup-service";
import type {
  AdditionalCurrenciesPayload,
  BaseCurrencyPayload,
  BusinessDetailsPayload,
  CountryStepPayload,
  FeatureTogglePayload,
  PaymentMethodsPayload,
  ReceiptConfigurationPayload,
  SetupProgressView,
  SetupReviewSummary,
} from "@/modules/business/onboarding/types";

async function requireSetupContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new SetupError(
      "SESSION_REQUIRED",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new SetupError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business before continuing setup.",
      403
    );
  }

  return context;
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (error instanceof SetupError || error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }

  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not save your setup progress. Please try again.",
    },
  };
}

export async function getSetupProgressAction(): Promise<
  AuthActionResult<SetupProgressView>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.getSetupProgress(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSetupReviewAction(): Promise<
  AuthActionResult<SetupReviewSummary>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.getReviewSummary(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeWelcomeAction(): Promise<
  AuthActionResult<SetupProgressView>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.completeWelcome(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveBusinessDetailsAction(
  payload: BusinessDetailsPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveBusinessDetails(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveCountryAction(
  payload: CountryStepPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveCountry(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveBaseCurrencyAction(
  payload: BaseCurrencyPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveBaseCurrency(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveAdditionalCurrenciesAction(
  payload: AdditionalCurrenciesPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveAdditionalCurrencies(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function skipOptionalStepAction(
  step: SetupStep
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.skipOptionalStep(context, step);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function savePaymentMethodsAction(
  payload: PaymentMethodsPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.savePaymentMethods(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveReceiptConfigurationAction(
  payload: ReceiptConfigurationPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveReceiptConfiguration(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveAiToggleAction(
  payload: FeatureTogglePayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveAiToggle(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveLoyaltyToggleAction(
  payload: FeatureTogglePayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveLoyaltyToggle(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeReviewAction(): Promise<
  AuthActionResult<SetupProgressView>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.completeReview(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateBusinessAction(): Promise<
  AuthActionResult<never>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    await setupService.completeReview(context);
    const result = await setupService.activateBusiness(context);
    redirect(
      `/setup/activated?businessName=${encodeURIComponent(result.businessName)}`
    );
  } catch (error) {
    // Next.js redirect() throws; rethrow so navigation is not swallowed.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest?: unknown }).digest === "string" &&
      String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    return toActionError(error);
  }
}

export async function getDashboardWelcomeAction(): Promise<
  AuthActionResult<{ businessName: string }>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const progress = await setupService.getSetupProgress(context);
    return {
      success: true,
      data: { businessName: progress.businessName },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSetupCatalogAction(): Promise<
  AuthActionResult<{
    countries: Awaited<
      ReturnType<
        ReturnType<
          typeof import("@/core/auth/services/reference-data-service").createReferenceDataService
        >["getActiveCountries"]
      >
    >;
    currencies: Awaited<
      ReturnType<
        ReturnType<
          typeof import("@/core/auth/services/reference-data-service").createReferenceDataService
        >["getActiveCurrencies"]
      >
    >;
    businessCountryCode: string;
    defaultCurrencyCode: string | null;
    profile: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["getProfile"]
      >
    >;
    configuration: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["getConfiguration"]
      >
    >;
    operatingCurrencies: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["getBusinessCurrencies"]
      >
    >;
    businessName: string;
  }>
> {
  try {
    const context = await requireSetupContext();
    const { createReferenceDataService } = await import(
      "@/core/auth/services/reference-data-service"
    );
    const referenceDataService = createReferenceDataService();
    const setupService = createBusinessSetupService();
    const businessContextService = createBusinessContextService();

    const [countries, currencies, progress, profile, configuration, operatingCurrencies] =
      await Promise.all([
        referenceDataService.getActiveCountries(),
        referenceDataService.getActiveCurrencies(),
        setupService.getSetupProgress(context),
        setupService.getProfile(context.businessId),
        setupService.getConfiguration(context.businessId),
        setupService.getBusinessCurrencies(context.businessId),
      ]);

    const defaultCurrency = await setupService.getDefaultCurrencyForBusiness(
      context.businessId
    );

    // Resolve country from live business row via review summary for accuracy.
    const review = await setupService.getReviewSummary(context);

    // Keep context service import used for future membership checks.
    void businessContextService;

    return {
      success: true,
      data: {
        countries,
        currencies,
        businessCountryCode: review.countryCode,
        defaultCurrencyCode: defaultCurrency?.currencyCode ?? null,
        profile,
        configuration,
        operatingCurrencies,
        businessName: progress.businessName,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}
