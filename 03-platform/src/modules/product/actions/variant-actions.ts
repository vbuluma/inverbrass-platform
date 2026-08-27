"use server";

/**
 * Purpose:
 * Expose Product Variants server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createProductVariantService } from "@/modules/product/services/product-variant-service";
import type {
  CloneVariantPayload,
  CreateVariantPayload,
  ProductVariantView,
  ProductVariantsPanelView,
  SearchVariantsPayload,
  UpdateVariantPayload,
  VariantDashboardView,
  VariantRegistrationCataloguesView,
  VariantWorkspaceView,
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

  console.error("[variant-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that variant action. Please try again.",
    },
  };
}

function revalidateVariantPaths(variantId?: string, productId?: string) {
  revalidatePath("/products/variants");
  if (variantId) {
    revalidatePath(`/products/variants/${variantId}`);
  }
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function getVariantDashboardAction(): Promise<
  AuthActionResult<VariantDashboardView>
> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getVariantRegistrationCataloguesAction(
  productId?: string
): Promise<AuthActionResult<VariantRegistrationCataloguesView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().getRegistrationCatalogues(
      context,
      productId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductVariantsPanelAction(
  productId: string
): Promise<AuthActionResult<ProductVariantsPanelView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().getProductVariantsPanel(
      context,
      productId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createVariantAction(
  payload: CreateVariantPayload
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().createVariant(context, payload);
    revalidateVariantPaths(data.variant.id, data.variant.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateVariantAction(
  variantId: string,
  payload: UpdateVariantPayload
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().updateVariant(
      context,
      variantId,
      payload
    );
    revalidateVariantPaths(variantId, data.variant.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function cloneVariantAction(
  variantId: string,
  payload: CloneVariantPayload = {}
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().cloneVariant(
      context,
      variantId,
      payload
    );
    revalidateVariantPaths(data.variant.id, data.variant.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateVariantAction(
  variantId: string
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().activateVariant(
      context,
      variantId
    );
    revalidateVariantPaths(variantId, data.variant.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendVariantAction(
  variantId: string
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().suspendVariant(
      context,
      variantId
    );
    revalidateVariantPaths(variantId, data.variant.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveVariantAction(
  variantId: string
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().archiveVariant(
      context,
      variantId
    );
    revalidateVariantPaths(variantId, data.variant.productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getVariantWorkspaceAction(
  variantId: string
): Promise<AuthActionResult<VariantWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().getWorkspace(context, variantId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchVariantsAction(
  payload: SearchVariantsPayload
): Promise<AuthActionResult<ProductVariantView[]>> {
  try {
    const context = await requireProductContext();
    const data = await createProductVariantService().searchVariants(context, payload);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
