"use server";

/**
 * Purpose:
 * Expose Digital Catalogue server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-007 – Digital Catalogue Engine
 */

import { requireProductChannelContext as requireProductContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createProductCatalogueService } from "@/modules/product/services/product-catalogue-service";
import type {
  CatalogueDashboardEntryView,
  CatalogueDashboardView,
  CatalogueWorkspaceView,
  ProductCataloguePanelView,
  PublishedCatalogueProductView,
  SearchCataloguePayload,
  UpsertPublicationPayload,
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

  console.error("[product-catalogue-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that catalogue action. Please try again.",
    },
  };
}

function revalidateCataloguePaths(productId?: string) {
  revalidatePath("/products/catalogue");
  if (productId) {
    revalidatePath(`/products/catalogue/${productId}`);
    revalidatePath(`/products/${productId}`);
  }
}

export async function getCatalogueDashboardAction(): Promise<
  AuthActionResult<CatalogueDashboardView>
> {
  try {
    const context = await requireProductContext();
    const data = await createProductCatalogueService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCatalogueWorkspaceAction(
  productId: string
): Promise<AuthActionResult<CatalogueWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductCatalogueService().getWorkspace(context, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductCataloguePanelAction(
  productId: string
): Promise<AuthActionResult<ProductCataloguePanelView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductCatalogueService().getProductCataloguePanel(
      context,
      productId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function upsertPublicationAction(
  productId: string,
  payload: UpsertPublicationPayload
): Promise<AuthActionResult<CatalogueWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductCatalogueService().upsertPublication(
      context,
      productId,
      payload
    );
    revalidateCataloguePaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchCatalogueAction(
  payload: SearchCataloguePayload
): Promise<AuthActionResult<CatalogueDashboardEntryView[]>> {
  try {
    const context = await requireProductContext();
    const data = await createProductCatalogueService().searchCatalogue(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getPublishedProductsAction(
  channelCode: string,
  featuredOnly = false
): Promise<AuthActionResult<PublishedCatalogueProductView[]>> {
  try {
    const context = await requireProductContext();
    const data = await createProductCatalogueService().getPublishedProducts(
      context,
      channelCode,
      featuredOnly
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCatalogueVisibilityOptionsAction(): Promise<
  AuthActionResult<Array<{ code: string; label: string }>>
> {
  try {
    await requireProductContext();
    const data = createProductCatalogueService().getVisibilityOptions();
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
