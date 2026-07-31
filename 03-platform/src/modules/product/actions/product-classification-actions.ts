"use server";

/**
 * Purpose:
 * Expose Product Classification server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import { revalidatePath } from "next/cache";

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { AuthError } from "@/core/auth/errors";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import { isNextRedirectError } from "@/core/auth/utils/next-redirect";
import { ProductError } from "@/modules/product/errors";
import { createProductClassificationService } from "@/modules/product/services/product-classification-service";
import type {
  AssignProductClassificationPayload,
  CreateProductClassificationPayload,
  MoveProductClassificationPayload,
  ProductClassificationDashboardView,
  ProductClassificationPanelView,
  ProductClassificationView,
  ProductClassificationWorkspaceView,
  SearchProductClassificationsPayload,
  SetPrimaryClassificationPayload,
  UpdateProductClassificationPayload,
} from "@/modules/product/types";
import type { ProductClassificationTreeNode } from "@/modules/product/types";

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

  console.error("[product-classification-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that classification action. Please try again.",
    },
  };
}

function revalidateClassificationPaths(
  classificationId?: string,
  productId?: string
) {
  revalidatePath("/products/classifications");
  if (classificationId) {
    revalidatePath(`/products/classifications/${classificationId}`);
  }
  revalidatePath("/products");
  if (productId) {
    revalidatePath(`/products/${productId}`);
  }
}

export async function getProductClassificationDashboardAction(): Promise<
  AuthActionResult<ProductClassificationDashboardView>
> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchProductClassificationsAction(
  search: SearchProductClassificationsPayload
): Promise<AuthActionResult<ProductClassificationView[]>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.searchClassifications(context, search);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductClassificationTreeAction(): Promise<
  AuthActionResult<ProductClassificationTreeNode[]>
> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.getTree(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductClassificationWorkspaceAction(
  classificationId: string
): Promise<AuthActionResult<ProductClassificationWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.getClassificationWorkspace(
      context,
      classificationId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductClassificationPanelAction(
  productId: string
): Promise<AuthActionResult<ProductClassificationPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.getProductClassifications(context, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductClassificationAction(
  payload: CreateProductClassificationPayload
): Promise<AuthActionResult<ProductClassificationDashboardView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.createClassification(context, payload);
    revalidateClassificationPaths();
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProductClassificationAction(
  classificationId: string,
  payload: UpdateProductClassificationPayload
): Promise<AuthActionResult<ProductClassificationWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.updateClassification(
      context,
      classificationId,
      payload
    );
    revalidateClassificationPaths(classificationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function moveProductClassificationAction(
  classificationId: string,
  payload: MoveProductClassificationPayload
): Promise<AuthActionResult<ProductClassificationWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.moveClassification(
      context,
      classificationId,
      payload
    );
    revalidateClassificationPaths(classificationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveProductClassificationAction(
  classificationId: string
): Promise<AuthActionResult<ProductClassificationWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.archiveClassification(context, classificationId);
    revalidateClassificationPaths(classificationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateProductClassificationAction(
  classificationId: string
): Promise<AuthActionResult<ProductClassificationWorkspaceView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.activateClassification(context, classificationId);
    revalidateClassificationPaths(classificationId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivateProductClassificationAction(
  classificationId: string
): Promise<AuthActionResult<ProductClassificationWorkspaceView>> {
  return archiveProductClassificationAction(classificationId);
}

export async function assignProductClassificationAction(
  productId: string,
  payload: AssignProductClassificationPayload
): Promise<AuthActionResult<ProductClassificationPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.assignProduct(context, productId, payload);
    revalidateClassificationPaths(payload.classificationId, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeProductClassificationAssignmentAction(
  productId: string,
  assignmentId: string
): Promise<AuthActionResult<ProductClassificationPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.removeAssignment(
      context,
      productId,
      assignmentId
    );
    revalidateClassificationPaths(undefined, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setPrimaryProductClassificationAction(
  productId: string,
  payload: SetPrimaryClassificationPayload
): Promise<AuthActionResult<ProductClassificationPanelView>> {
  try {
    const context = await requireProductContext();
    const service = createProductClassificationService();
    const data = await service.setPrimaryAssignment(
      context,
      productId,
      payload
    );
    revalidateClassificationPaths(undefined, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
