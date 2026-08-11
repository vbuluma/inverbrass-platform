"use server";

/**
 * Purpose:
 * Expose CRM analytics server actions.
 *
 * Implementation Package:
 * BP-004 / IP-12 – CRM Analytics & Dashboards
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { createCrmAnalyticsService } from "@/modules/crm/analytics/services/crm-analytics-service";
import type {
  CrmAnalyticsDashboardView,
  CrmAnalyticsExportView,
  CrmAnalyticsFilters,
  CrmCustomerAnalyticsView,
} from "@/modules/crm/analytics/types";
import { CrmError } from "@/modules/crm/errors";

async function requireCrmContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new CrmError("SESSION_REQUIRED", "Your session has expired. Please sign in again.", 401);
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new CrmError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business to continue.",
      403
    );
  }

  return context;
}

function isNextDynamicServerError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).includes("DYNAMIC_SERVER_USAGE")
  );
}

function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error) || isNextDynamicServerError(error)) {
    throw error;
  }
  if (error instanceof CrmError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  console.error("[crm-analytics-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

export async function getCrmAnalyticsDashboardAction(
  filters: CrmAnalyticsFilters = {}
): Promise<AuthActionResult<CrmAnalyticsDashboardView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCrmAnalyticsService().getDashboard(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshCrmAnalyticsAction(
  filters: CrmAnalyticsFilters = {}
): Promise<AuthActionResult<CrmAnalyticsDashboardView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCrmAnalyticsService().refreshSnapshots(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function exportCrmAnalyticsAction(
  filters: CrmAnalyticsFilters = {}
): Promise<AuthActionResult<CrmAnalyticsExportView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCrmAnalyticsService().exportCsv(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCrmCustomerAnalyticsAction(
  partyId: string
): Promise<AuthActionResult<CrmCustomerAnalyticsView>> {
  try {
    const context = await requireCrmContext();
    const data = await createCrmAnalyticsService().getCustomerAnalytics(
      context,
      partyId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
