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
 * BP-001 / IP-006 – Business Setup Wizard, Configuration & Activation
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
import {
  SETUP_ALLOW_BASE_CURRENCY_CHANGE,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import { SetupError } from "@/modules/business/onboarding/errors";
import { createBusinessSetupService } from "@/modules/business/onboarding/services/business-setup-service";
import type {
  AdditionalCurrenciesPayload,
  BaseCurrencyPayload,
  BranchSetupPayload,
  BusinessClassificationPayload,
  BusinessDetailsPayload,
  BusinessOperationsPayload,
  CountryStepPayload,
  CreatedEmployeeCredential,
  EmployeeSetupPayload,
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

export async function saveBusinessClassificationAction(
  payload: BusinessClassificationPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveBusinessClassification(
      context,
      payload
    );
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

export async function saveBusinessOperationsAction(
  payload: BusinessOperationsPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveBusinessOperations(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveBranchSetupAction(
  payload: BranchSetupPayload
): Promise<AuthActionResult<SetupProgressView>> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveBranchSetup(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveEmployeeSetupAction(
  payload: EmployeeSetupPayload
): Promise<
  AuthActionResult<{
    progress: SetupProgressView;
    credentials: CreatedEmployeeCredential[];
  }>
> {
  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.saveEmployeeSetup(context, payload);
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
    const { isNextRedirectError } = await import(
      "@/core/auth/utils/next-redirect"
    );
    if (isNextRedirectError(error)) {
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
    industries: Awaited<
      ReturnType<
        ReturnType<
          typeof import("@/core/auth/services/reference-data-service").createReferenceDataService
        >["getActiveIndustries"]
      >
    >;
    businessTypes: Awaited<
      ReturnType<
        ReturnType<
          typeof import("@/core/auth/services/reference-data-service").createReferenceDataService
        >["getActiveBusinessTypes"]
      >
    >;
    businessCountryCode: string;
    defaultCurrencyCode: string | null;
    allowBaseCurrencyChange: boolean;
    profile: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["getProfile"]
      >
    >;
    classification: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["getClassification"]
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
    branches: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["listBranches"]
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

    // Sequential reads avoid contention on the shared max:1 DB pool.
    const countries = await referenceDataService.getActiveCountries();
    const currencies = await referenceDataService.getActiveCurrencies();
    const industries = await referenceDataService.getActiveIndustries();
    const businessTypes = await referenceDataService.getActiveBusinessTypes();
    const progress = await setupService.getSetupProgress(context);
    const profile = await setupService.getProfile(context.businessId);
    const classification = await setupService.getClassification(
      context.businessId
    );
    const configuration = await setupService.getConfiguration(
      context.businessId
    );
    const operatingCurrencies = await setupService.getBusinessCurrencies(
      context.businessId
    );
    const defaultCurrency = await setupService.getDefaultCurrencyForBusiness(
      context.businessId
    );
    const branches = await setupService.listBranches(context.businessId);
    const review = await setupService.getReviewSummary(context);

    return {
      success: true,
      data: {
        countries,
        currencies,
        industries,
        businessTypes,
        businessCountryCode: review.countryCode,
        defaultCurrencyCode: defaultCurrency?.currencyCode ?? null,
        allowBaseCurrencyChange: SETUP_ALLOW_BASE_CURRENCY_CHANGE,
        profile,
        classification,
        configuration,
        operatingCurrencies,
        branches,
        businessName: progress.businessName,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}
