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
import type { AuthSessionUser } from "@/core/auth/types";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  SETUP_ALLOW_BASE_CURRENCY_CHANGE,
  SETUP_STEPS,
  type SetupStep,
} from "@/modules/business/onboarding/constants";
import { SetupError } from "@/modules/business/onboarding/errors";
import { createBusinessSetupService } from "@/modules/business/onboarding/services/business-setup-service";
import type {
  AdditionalCurrenciesPayload,
  BaseCurrencyPayload,
  BranchSetupPayload,
  BusinessClassificationPayload,
  BusinessDashboardView,
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

/**
 * WHAT: Resolve a personal greeting name for the Business Dashboard.
 * WHY: BP-001 registration may derive first/last from proposed business name
 * ("InverMeU2" + "User"). Prefer the platform username (mobile) in that case.
 */
function resolveDashboardGreetingName(
  user: AuthSessionUser,
  businessName: string
): string {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const first = user.firstName.trim();
  const last = user.lastName.trim();
  const business = businessName.trim().toLowerCase();
  const syntheticBusinessUserLabel =
    last.toLowerCase() === "user" &&
    first.length > 0 &&
    (business === first.toLowerCase() ||
      business.startsWith(`${first.toLowerCase()} `) ||
      business.startsWith(first.toLowerCase()));

  if (syntheticBusinessUserLabel) {
    return user.phoneNumber || user.email || fullName || "there";
  }

  if (fullName && fullName.toLowerCase() !== "platform user") {
    return fullName;
  }

  return user.phoneNumber || user.email || "there";
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (error instanceof SetupError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.field ? { field: error.field } : {}),
      },
    };
  }

  if (error instanceof AuthError) {
    return {
      success: false,
      error: { code: error.code, message: error.message },
    };
  }

  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not load setup. Please try again.",
    },
  };
}

/**
 * WHAT: Load an optional setup catalog slice; never abort the wizard for it.
 * WHY: Missing branches/config/currencies/profile are valid early-setup states.
 */
async function loadOptionalCatalogSlice<T>(
  label: string,
  load: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error(`[setup.catalog] optional.${label}.fail`, error);
    return fallback;
  }
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

/**
 * WHAT: Complete Welcome and server-redirect to Business Profile.
 * WHY: Client router.push + router.refresh raced and bounced back to /welcome,
 * leaving the Start Setup button stuck on "Starting...".
 */
export async function completeWelcomeAction(): Promise<
  AuthActionResult<SetupProgressView>
> {
  console.info("[setup] action.start", { action: "completeWelcome" });

  try {
    const context = await requireSetupContext();
    const setupService = createBusinessSetupService();
    const data = await setupService.completeWelcome(context);

    const nextStep =
      data.resumeStep === SETUP_STEPS.COMPLETED
        ? SETUP_STEPS.REVIEW
        : data.resumeStep === SETUP_STEPS.BUSINESS_DETAILS
          ? SETUP_STEPS.BUSINESS_PROFILE
          : data.resumeStep;

    console.info("[setup] redirect.business-details", {
      nextStep,
      resumeStep: data.resumeStep,
      progressPercent: data.progressPercent,
      completedSteps: data.completedSteps,
    });

    redirect(`/setup/${nextStep}`);
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    console.error("[setup] action.failed", {
      action: "completeWelcome",
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query:
        error &&
        typeof error === "object" &&
        "query" in error
          ? (error as { query?: unknown }).query
          : undefined,
    });

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

/**
 * WHAT: Load the operational Business Dashboard for the active business context.
 * WHY: /dashboard is the business run surface — distinct from Platform Home.
 */
export async function getBusinessDashboardAction(): Promise<
  AuthActionResult<BusinessDashboardView>
> {
  try {
    const authService = createAuthService();
    const user = await authService.getAuthenticatedUser();

    if (!user) {
      throw new SetupError(
        "SESSION_REQUIRED",
        "Your session has expired. Please sign in again.",
        401
      );
    }

    const context = await requireSetupContext();
    const businessContextService = createBusinessContextService();
    const businesses = await businessContextService.getSelectableBusinesses(
      user.platformUserId
    );
    const setupService = createBusinessSetupService();
    const currentBusiness = businesses.find(
      (item) => item.businessId === context.businessId
    );
    const businessName = currentBusiness?.businessName ?? "";
    const displayName = resolveDashboardGreetingName(user, businessName);
    const roleLabel = currentBusiness?.isOwner ? "Owner" : "Administrator";

    const data = await setupService.getBusinessDashboard(context, {
      currentUserName: displayName,
      roleLabel,
      canSwitchBusiness: businesses.length >= 2,
    });

    return { success: true, data };
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
    > | null;
    classification: Awaited<
      ReturnType<
        ReturnType<typeof createBusinessSetupService>["getClassification"]
      >
    > | null;
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

    // Required: session/context already validated; progress + catalogs gate the wizard.
    // Sequential reads avoid contention on the shared max:1 DB pool.
    const countries = await referenceDataService.getActiveCountries();
    const currencies = await referenceDataService.getActiveCurrencies();
    const industries = await referenceDataService.getActiveIndustries();
    const businessTypes = await referenceDataService.getActiveBusinessTypes();
    const progress = await setupService.getSetupProgress(context);
    const businessCountryCode = await setupService.getBusinessCountryCode(
      context.businessId
    );

    // Optional early-setup slices: empty/null defaults — never fail Open → Wizard.
    const profile = await loadOptionalCatalogSlice(
      "profile",
      () => setupService.getProfile(context.businessId),
      null
    );
    const classification = await loadOptionalCatalogSlice(
      "classification",
      () => setupService.getClassification(context.businessId),
      null
    );
    const configuration = await loadOptionalCatalogSlice(
      "configuration",
      () => setupService.getConfiguration(context.businessId),
      null
    );
    const operatingCurrencies = await loadOptionalCatalogSlice(
      "operatingCurrencies",
      () => setupService.getBusinessCurrencies(context.businessId),
      []
    );
    const defaultCurrency = await loadOptionalCatalogSlice(
      "defaultCurrency",
      () => setupService.getDefaultCurrencyForBusiness(context.businessId),
      null
    );
    const branches = await loadOptionalCatalogSlice(
      "branches",
      () => setupService.listBranches(context.businessId),
      []
    );

    console.info("[open-business] stage=setup.catalog.ok", {
      businessId: context.businessId,
      businessCountryCode,
      businessName: progress.businessName,
      branchCount: branches.length,
    });

    return {
      success: true,
      data: {
        countries,
        currencies,
        industries,
        businessTypes,
        businessCountryCode,
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
    console.error("[open-business] stage=setup.catalog.fail", error);
    return toActionError(error);
  }
}
