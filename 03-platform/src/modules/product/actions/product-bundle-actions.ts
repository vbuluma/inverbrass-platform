"use server";

/**
 * Purpose:
 * Expose Product Bundles server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createProductBundleService } from "@/modules/product/services/product-bundle-service";
import type {
  AddBundleItemPayload,
  BundleDashboardView,
  BundleProductSearchResult,
  BundleRegistrationCataloguesView,
  BundleWorkspaceView,
  CreateBundlePayload,
  ProductBundleView,
  ProductBundlesPanelView,
  SearchBundlesPayload,
  UpdateBundleItemPayload,
  UpdateBundlePayload,
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

  console.error("[product-bundle-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that bundle action. Please try again.",
    },
  };
}

function revalidateBundlePaths(bundleId?: string, productId?: string) {
  revalidatePath("/products/bundles");
  if (bundleId) {
    revalidatePath(`/products/bundles/${bundleId}`);
  }
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function getBundleDashboardAction(): Promise<
  AuthActionResult<BundleDashboardView>
> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getBundleRegistrationCataloguesAction(): Promise<
  AuthActionResult<BundleRegistrationCataloguesView>
> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchBundleProductsAction(
  query?: string
): Promise<AuthActionResult<BundleProductSearchResult[]>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().searchBundleProducts(
      context,
      query
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductBundlesPanelAction(
  productId: string
): Promise<AuthActionResult<ProductBundlesPanelView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().getProductBundlesPanel(
      context,
      productId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createBundleAction(
  payload: CreateBundlePayload
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().createBundle(context, payload);
    revalidateBundlePaths(data.bundle.id);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateBundleAction(
  bundleId: string,
  payload: UpdateBundlePayload
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().updateBundle(
      context,
      bundleId,
      payload
    );
    revalidateBundlePaths(bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addBundleItemAction(
  bundleId: string,
  payload: AddBundleItemPayload
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().addBundleItem(
      context,
      bundleId,
      payload
    );
    revalidateBundlePaths(bundleId, payload.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateBundleItemAction(
  bundleId: string,
  itemId: string,
  payload: UpdateBundleItemPayload
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().updateBundleItem(
      context,
      bundleId,
      itemId,
      payload
    );
    revalidateBundlePaths(bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeBundleItemAction(
  bundleId: string,
  itemId: string
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().removeBundleItem(
      context,
      bundleId,
      itemId
    );
    revalidateBundlePaths(bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateBundleAction(
  bundleId: string
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().activateBundle(context, bundleId);
    revalidateBundlePaths(bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendBundleAction(
  bundleId: string
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().suspendBundle(context, bundleId);
    revalidateBundlePaths(bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveBundleAction(
  bundleId: string
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().archiveBundle(context, bundleId);
    revalidateBundlePaths(bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getBundleWorkspaceAction(
  bundleId: string
): Promise<AuthActionResult<BundleWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().getWorkspace(context, bundleId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchBundlesAction(
  payload: SearchBundlesPayload
): Promise<AuthActionResult<ProductBundleView[]>> {
  try {
    const context = await requireProductContext();
    const data = await createProductBundleService().searchBundles(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
