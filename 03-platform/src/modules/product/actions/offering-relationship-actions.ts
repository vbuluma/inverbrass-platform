"use server";

/**
 * Purpose:
 * Expose Offering Relationship Management server actions to the App Router UI.
 *
 * Architecture:
 * UI → Server Actions → OfferingRelationshipService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
 */

import { requireProductChannelContext as requireContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createOfferingRelationshipService } from "@/modules/product/services/offering-relationship-service";
import type {
  AddOfferingRelationshipPayload,
  OfferingRelationshipsPanelView,
  ProductSummaryView,
  UpdateOfferingRelationshipPayload,
} from "@/modules/product/types";


function toActionError(error: unknown): AuthActionResult<never> {
  if (isNextRedirectError(error)) {
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
  console.error("[offering-relationship-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that product action. Please try again.",
    },
  };
}

function revalidateProductPath(productId: string) {
  revalidatePath(`/products/${productId}`);
}

export async function getOfferingRelationshipsPanelAction(
  productId: string
): Promise<AuthActionResult<OfferingRelationshipsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.getOfferingRelationshipsPanel(
      context,
      productId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchOfferingsForRelationshipAction(
  productId: string,
  query: string
): Promise<AuthActionResult<ProductSummaryView[]>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.searchOfferingsForRelationship(
      context,
      productId,
      query
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addOfferingRelationshipAction(
  productId: string,
  payload: AddOfferingRelationshipPayload
): Promise<AuthActionResult<OfferingRelationshipsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.addRelationship(context, productId, payload);
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOfferingRelationshipAction(
  productId: string,
  offeringRelationshipId: string,
  payload: UpdateOfferingRelationshipPayload
): Promise<AuthActionResult<OfferingRelationshipsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.updateRelationship(
      context,
      productId,
      offeringRelationshipId,
      payload
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivateOfferingRelationshipAction(
  productId: string,
  offeringRelationshipId: string
): Promise<AuthActionResult<OfferingRelationshipsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.deactivateRelationship(
      context,
      productId,
      offeringRelationshipId
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivateOfferingRelationshipAction(
  productId: string,
  offeringRelationshipId: string
): Promise<AuthActionResult<OfferingRelationshipsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.reactivateRelationship(
      context,
      productId,
      offeringRelationshipId
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeOfferingRelationshipAction(
  productId: string,
  offeringRelationshipId: string
): Promise<AuthActionResult<OfferingRelationshipsPanelView>> {
  try {
    const context = await requireContext();
    const service = createOfferingRelationshipService();
    const data = await service.removeRelationship(
      context,
      productId,
      offeringRelationshipId
    );
    revalidateProductPath(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
