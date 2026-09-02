"use server";

/**
 * Purpose:
 * Expose Offering Governance server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-013 – Offering Governance
 */

import { requireProductChannelContext as requireProductContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createOfferingGovernanceService } from "@/modules/product/services/offering-governance-service";
import type {
  OfferingGovernanceDashboardView,
  OfferingGovernanceFiltersPayload,
  ProductGovernancePanelView,
  RunOfferingGovernanceValidationPayload,
  ToggleOfferingGovernanceLockPayload,
  UpdateOfferingGovernanceNotesPayload,
  UpdateOfferingGovernanceOwnershipPayload,
} from "@/modules/product/types";


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
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }

  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "Something went wrong. Please try again.",
    },
  };
}

function revalidateProductPaths(offeringId: string) {
  revalidatePath("/products");
  revalidatePath(`/products/${offeringId}`);
  revalidatePath("/products/governance");
}

export async function getOfferingGovernanceDashboardAction(): Promise<
  AuthActionResult<OfferingGovernanceDashboardView>
> {
  try {
    const context = await requireProductContext();
    const service = createOfferingGovernanceService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductGovernancePanelAction(
  offeringId: string,
  filters: OfferingGovernanceFiltersPayload = {}
): Promise<AuthActionResult<ProductGovernancePanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingGovernanceService();
    const data = await service.getProductGovernancePanel(
      context,
      offeringId,
      filters
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOfferingGovernanceOwnershipAction(
  payload: UpdateOfferingGovernanceOwnershipPayload
): Promise<AuthActionResult<ProductGovernancePanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingGovernanceService();
    const data = await service.updateOwnership(context, payload);
    revalidateProductPaths(payload.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOfferingGovernanceNotesAction(
  payload: UpdateOfferingGovernanceNotesPayload
): Promise<AuthActionResult<ProductGovernancePanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingGovernanceService();
    const data = await service.updateNotes(context, payload);
    revalidateProductPaths(payload.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleOfferingGovernanceLockAction(
  payload: ToggleOfferingGovernanceLockPayload
): Promise<AuthActionResult<ProductGovernancePanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingGovernanceService();
    const data = await service.toggleLock(context, payload);
    revalidateProductPaths(payload.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function runOfferingGovernanceValidationAction(
  payload: RunOfferingGovernanceValidationPayload
): Promise<AuthActionResult<ProductGovernancePanelView>> {
  try {
    const context = await requireProductContext();
    const service = createOfferingGovernanceService();
    const data = await service.runValidation(context, payload);
    revalidateProductPaths(payload.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
