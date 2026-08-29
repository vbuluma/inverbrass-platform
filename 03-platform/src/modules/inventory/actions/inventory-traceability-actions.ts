"use server";

/**
 * Purpose:
 * Server actions for inventory batch and serial lookup.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import { createTraceabilityService } from "@/modules/inventory/services/inventory-traceability-service";
import type {
  InventoryLotView,
  InventoryTraceEventView,
  InventoryTraceabilitySearchQuery,
  InventoryTrackedUnitView,
} from "@/modules/inventory/types";

export type InventoryTraceActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryTraceActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryTraceActionError };

async function requireInventoryContext() {
  const authService = createAuthService();
  const user = await authService.getAuthenticatedUser();
  if (!user) {
    throw new InventoryError("SESSION_REQUIRED", undefined, 401);
  }
  const businessContextService = createBusinessContextService();
  const context = await businessContextService.getCurrentContext();
  if (!context) {
    throw new InventoryError("BUSINESS_CONTEXT_REQUIRED", undefined, 403);
  }
  return context;
}

function toActionError(error: unknown): InventoryTraceActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof InventoryError) {
    return {
      success: false,
      error: { code: error.code, message: error.message, field: error.field },
    };
  }
  if (error instanceof AuthError) {
    return { success: false, error: { code: error.code, message: error.message } };
  }
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Traceability details could not be loaded. Please try again.",
    },
  };
}

export async function searchTraceabilityAction(
  query: InventoryTraceabilitySearchQuery
): Promise<
  InventoryTraceActionResult<{ lots: InventoryLotView[]; units: InventoryTrackedUnitView[] }>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createTraceabilityService().search(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getLotDetailAction(lotId: string): Promise<
  InventoryTraceActionResult<{ lot: InventoryLotView; history: InventoryTraceEventView[] }>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createTraceabilityService().getLotDetail(context, lotId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getTrackedUnitDetailAction(unitId: string): Promise<
  InventoryTraceActionResult<{
    unit: InventoryTrackedUnitView;
    history: InventoryTraceEventView[];
  }>
> {
  try {
    const context = await requireInventoryContext();
    const data = await createTraceabilityService().getUnitDetail(context, unitId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
