"use server";

/**
 * Purpose:
 * Expose Offering Pricing server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import { requireProductChannelContext as requireProductContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createPricingService } from "@/modules/product/services/pricing-service";
import type {
  ComparePricingItemsPayload,
  CreatePricingCataloguePayload,
  CreatePricingItemPayload,
  PricingCatalogueView,
  PricingComparisonView,
  PricingDashboardView,
  PricingItemView,
  PricingRegistrationCataloguesView,
  ProductPricingPanelView,
  SearchPricingItemsPayload,
  UpdatePricingCataloguePayload,
  UpdatePricingItemPayload,
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
      error: { code: error.code, message: error.message },
    };
  }

  console.error("[pricing-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that pricing action. Please try again.",
    },
  };
}

function revalidatePricingPaths(offeringId?: string) {
  revalidatePath("/products/pricing");
  revalidatePath("/products");
  if (offeringId) {
    revalidatePath(`/products/${offeringId}`);
  }
}

export async function getPricingDashboardAction(): Promise<
  AuthActionResult<PricingDashboardView>
> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPricingRegistrationCataloguesAction(): Promise<
  AuthActionResult<PricingRegistrationCataloguesView>
> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductPricingPanelAction(
  offeringId: string
): Promise<AuthActionResult<ProductPricingPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.getProductPricingPanel(context, offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createPricingCatalogueAction(
  payload: CreatePricingCataloguePayload
): Promise<AuthActionResult<PricingCatalogueView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.createCatalogue(context, payload);
    revalidatePricingPaths();
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePricingCatalogueAction(
  catalogueId: string,
  payload: UpdatePricingCataloguePayload
): Promise<AuthActionResult<PricingCatalogueView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.updateCatalogue(context, catalogueId, payload);
    revalidatePricingPaths();
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createPricingItemAction(
  payload: CreatePricingItemPayload
): Promise<AuthActionResult<PricingItemView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.createPriceItem(context, payload);
    revalidatePricingPaths(payload.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePricingItemAction(
  itemId: string,
  payload: UpdatePricingItemPayload
): Promise<AuthActionResult<PricingItemView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.updatePriceItem(context, itemId, payload);
    revalidatePricingPaths(data.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activatePricingItemAction(
  itemId: string
): Promise<AuthActionResult<PricingItemView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.activatePriceItem(context, itemId);
    revalidatePricingPaths(data.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function expirePricingItemAction(
  itemId: string
): Promise<AuthActionResult<PricingItemView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.expirePriceItem(context, itemId);
    revalidatePricingPaths(data.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archivePricingItemAction(
  itemId: string
): Promise<AuthActionResult<PricingItemView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.archivePriceItem(context, itemId);
    revalidatePricingPaths(data.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function copyPricingItemAction(
  itemId: string
): Promise<AuthActionResult<PricingItemView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.copyPriceItem(context, itemId);
    revalidatePricingPaths(data.offeringId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchPricingItemsAction(
  payload: SearchPricingItemsPayload
): Promise<AuthActionResult<PricingItemView[]>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.searchPriceItems(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function comparePricingItemsAction(
  payload: ComparePricingItemsPayload
): Promise<AuthActionResult<PricingComparisonView>> {
  try {
    const context = await requireProductContext();
    const service = createPricingService();
    const data = await service.comparePriceItems(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
