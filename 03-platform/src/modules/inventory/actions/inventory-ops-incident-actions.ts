"use server";

/**
 * Purpose:
 * Server actions for inventory exception investigation and resolution.
 *
 * Implementation Package:
 * BP-008 / IP-09 – Inventory Operations, Exceptions & Controls
 */

import { revalidatePath } from "next/cache";

import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { InventoryError } from "@/modules/inventory/errors";
import {
  createDefaultInventoryOpsIncidentDependencies,
  createInventoryOpsIncidentService,
} from "@/modules/inventory/services/inventory-ops-incident-service";
import { createStockAdjustmentService } from "@/modules/inventory/services/stock-adjustment-service";
import type {
  CreateAdjustmentCommand,
  InventoryOpsIncidentTypeRef,
  InventoryOpsIncidentView,
} from "@/modules/inventory/types";

export type InventoryOpsIncidentActionError = {
  code: string;
  message: string;
  field?: string;
};

export type InventoryOpsIncidentActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: InventoryOpsIncidentActionError };

function createOpsIncidentService() {
  return createInventoryOpsIncidentService({
    ...createDefaultInventoryOpsIncidentDependencies(),
    adjustments: createStockAdjustmentService(),
  });
}

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

function toActionError(error: unknown): InventoryOpsIncidentActionResult<never> {
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
      message: "This exception could not be updated. Please try again.",
    },
  };
}

function revalidateExceptionPaths(exceptionId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/exceptions");
  if (exceptionId) {
    revalidatePath(`/inventory/exceptions/${exceptionId}`);
  }
}

export async function listInventoryExceptionsAction(query?: {
  status?: string | null;
  incidentType?: string | null;
  severity?: string | null;
  stockItemId?: string | null;
  locationId?: string | null;
}): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView[]>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().listIncidents(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getInventoryExceptionAction(
  exceptionId: string
): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().getIncident(context, exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listInventoryExceptionTypesAction(): Promise<
  InventoryOpsIncidentActionResult<InventoryOpsIncidentTypeRef[]>
> {
  try {
    await requireInventoryContext();
    const data = await createOpsIncidentService().listTypes();
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function startExceptionInvestigationAction(
  exceptionId: string
): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().startInvestigation(context, exceptionId);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function requestExceptionResolutionAction(input: {
  exceptionId: string;
  resolutionAction: string;
  reason: string;
  notes?: string | null;
  adjustment?: CreateAdjustmentCommand | null;
}): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().requestResolution(context, {
      incidentId: input.exceptionId,
      resolutionAction: input.resolutionAction,
      reason: input.reason,
      notes: input.notes,
      adjustment: input.adjustment,
    });
    revalidateExceptionPaths(input.exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveExceptionResolutionAction(
  exceptionId: string
): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().approveResolution(context, exceptionId);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectExceptionResolutionAction(
  exceptionId: string,
  reason: string
): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().rejectResolution(context, exceptionId, reason);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectInventoryExceptionAction(
  exceptionId: string,
  reason: string
): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().rejectIncident(context, exceptionId, reason);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closeInventoryExceptionAction(
  exceptionId: string,
  reason: string
): Promise<InventoryOpsIncidentActionResult<InventoryOpsIncidentView>> {
  try {
    const context = await requireInventoryContext();
    const data = await createOpsIncidentService().closeIncident(context, exceptionId, reason);
    revalidateExceptionPaths(exceptionId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
