"use server";

/**
 * Purpose:
 * Server actions for Product Lifecycle Management.
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import {
  platformError,
  platformSuccess,
} from "@/core/platform/platform-action-helpers";
import type { PlatformActionResult } from "@/core/platform/types";
import { ProductError } from "@/modules/product/errors";
import { createProductLifecycleService } from "@/modules/product/services/product-lifecycle-service";
import type {
  ProductLifecycleDashboardView,
  ProductLifecyclePanelView,
  ScheduleLifecycleActionPayload,
  SetReplacementProductPayload,
} from "@/modules/product/types";

async function requireContext() {
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
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message:
        error instanceof Error ? error.message : "An unexpected error occurred.",
    },
  };
}

function toPlatformError(error: unknown): PlatformActionResult<never> {
  if (isNextRedirectError(error)) {
    throw error;
  }
  if (error instanceof ProductError) {
    return platformError(error.message, error.message, error.field);
  }
  if (error instanceof AuthError) {
    return platformError(error.message, error.message);
  }
  return platformError(
    "Unexpected error",
    error instanceof Error ? error.message : "An unexpected error occurred."
  );
}

function revalidateProductPaths(productId: string) {
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products/lifecycle");
  revalidatePath("/products");
}

export async function getProductLifecyclePanelAction(
  productId: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.getLifecyclePanel(context, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductLifecycleDashboardAction(): Promise<
  AuthActionResult<ProductLifecycleDashboardView>
> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function submitProductForApprovalAction(
  productId: string,
  reason?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.submitForApproval(context, productId, reason);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function approveProductLifecycleAction(
  productId: string,
  reason?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.approve(context, productId, reason);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rejectProductLifecycleAction(
  productId: string,
  reason?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.reject(context, productId, reason);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateProductLifecycleAction(
  productId: string,
  effectiveFrom?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.activate(context, productId, effectiveFrom);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendProductLifecycleAction(
  productId: string,
  reason?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.suspend(context, productId, reason);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reactivateProductLifecycleAction(
  productId: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.reactivate(context, productId);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deprecateProductLifecycleAction(
  productId: string,
  reason?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.deprecate(context, productId, reason);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveProductLifecycleAction(
  productId: string,
  reason?: string
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.archive(context, productId, reason);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductNewVersionAction(
  productId: string,
  isMajor = false
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.createNewVersion(context, productId, isMajor);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProductReplacementAction(
  productId: string,
  payload: SetReplacementProductPayload
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.setReplacementProduct(
      context,
      productId,
      payload
    );
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function scheduleProductLifecycleAction(
  productId: string,
  payload: ScheduleLifecycleActionPayload
): Promise<AuthActionResult<ProductLifecyclePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductLifecycleService();
    const data = await service.scheduleAction(context, productId, payload);
    revalidateProductPaths(productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
