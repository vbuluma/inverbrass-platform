"use server";

/**
 * Purpose:
 * Expose Offering Analytics server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-012 – Offering Analytics & Performance
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createOfferingAnalyticsService } from "@/modules/product/services/offering-analytics-service";
import type {
  CompareOfferingAnalyticsPayload,
  OfferingAnalyticsComparisonView,
  OfferingAnalyticsDashboardView,
  OfferingAnalyticsExportView,
  OfferingAnalyticsFiltersPayload,
  ProductAnalyticsPanelView,
  RefreshOfferingAnalyticsPayload,
} from "@/modules/product/types";

async function requireProductContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();

  if (!user) {
    throw new ProductError(
      "SESSION_REQUIRED",
      "Your session has expired. Please sign in again.",
      401
    );
  }

  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();

  if (!context) {
    throw new ProductError(
      "BUSINESS_CONTEXT_REQUIRED",
      "Select a business before managing products.",
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

  if (error instanceof ProductError) {
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

  console.error("[offering-analytics-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that analytics action. Please try again.",
    },
  };
}

function revalidateAnalyticsPaths(offeringId?: string) {
  revalidatePath("/products/analytics");
  revalidatePath("/products");
  if (offeringId) {
    revalidatePath(`/products/${offeringId}`);
  }
}

export async function getOfferingAnalyticsDashboardAction(): Promise<
  AuthActionResult<OfferingAnalyticsDashboardView>
> {
  try {
    const context = await requireProductContext();
    const service = createOfferingAnalyticsService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductAnalyticsPanelAction(
  offeringId: string,
  filters: OfferingAnalyticsFiltersPayload = {}
): Promise<AuthActionResult<ProductAnalyticsPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingAnalyticsService();
    const data = await service.getProductAnalyticsPanel(
      context,
      offeringId,
      filters
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function refreshOfferingAnalyticsAction(
  payload: RefreshOfferingAnalyticsPayload
): Promise<AuthActionResult<ProductAnalyticsPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingAnalyticsService();
    const data = await service.refreshOfferingAnalytics(context, payload);
    revalidateAnalyticsPaths(payload.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function compareOfferingAnalyticsAction(
  payload: CompareOfferingAnalyticsPayload
): Promise<AuthActionResult<OfferingAnalyticsComparisonView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingAnalyticsService();
    const data = await service.compareOfferings(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function exportOfferingAnalyticsAction(
  offeringId: string,
  filters: OfferingAnalyticsFiltersPayload = {}
): Promise<AuthActionResult<OfferingAnalyticsExportView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingAnalyticsService();
    const data = await service.exportOfferingAnalytics(
      context,
      offeringId,
      filters
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
