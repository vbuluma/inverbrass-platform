"use server";

/**
 * Purpose:
 * Expose Product Foundation server actions to the App Router UI.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
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
import { createProductService } from "@/modules/product/services/product-service";
import type {
  CreateProductPayload,
  ProductDashboardView,
  ProductDetailView,
  ProductListFilters,
  ProductListView,
  ProductRegistrationCatalogues,
  ProductSummaryView,
  UpdateProductPayload,
} from "@/modules/product/types";

export type ProductActionResult<T> = AuthActionResult<T> & {
  platform?: PlatformActionResult<T>;
};

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

  console.error("[product-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not complete that Product action. Please try again.",
    },
  };
}

function productCreateSummary(product: ProductDetailView) {
  return [
    { label: "Product Code", value: product.productCode },
    { label: "Status", value: product.statusName },
    { label: "Type", value: product.productTypeName },
    { label: "Source", value: product.recordSourceLabel },
  ];
}

export async function getProductDashboardAction(): Promise<
  AuthActionResult<ProductDashboardView>
> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.getDashboard(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listProductsAction(
  filters: ProductListFilters = {}
): Promise<AuthActionResult<ProductListView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.listProducts(context, filters);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function searchProductsAction(
  query: string
): Promise<AuthActionResult<ProductSummaryView[]>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.searchProducts(context, query);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductAction(
  productId: string
): Promise<AuthActionResult<ProductDetailView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.getProduct(context, productId);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getProductRegistrationCataloguesAction(): Promise<
  AuthActionResult<ProductRegistrationCatalogues>
> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.getRegistrationCatalogues(context);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductAction(
  payload: CreateProductPayload
): Promise<ProductActionResult<ProductDetailView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.createProduct(context, payload);
    revalidatePath("/products");
    revalidatePath(`/products/${data.id}`);

    return {
      success: true,
      data,
      platform: platformSuccess(
        "Product Created",
        `${data.productName} has been registered in the catalogue.`,
        data,
        [
          {
            label: "Open Product Workspace",
            href: `/products/${data.id}`,
            variant: "default",
          },
          {
            label: "Register Another Product",
            href: "/products/new",
            variant: "outline",
          },
        ],
        {
          completionTitle: "Product registered",
          summary: productCreateSummary(data),
        }
      ),
    };
  } catch (error) {
    const base = toActionError(error);
    if (!base.success) {
      return {
        ...base,
        platform: platformError(
          "Could not create product",
          base.error.message,
          base.error.field
        ),
      };
    }
    return base;
  }
}

export async function updateProductAction(
  productId: string,
  payload: UpdateProductPayload
): Promise<AuthActionResult<ProductDetailView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.updateProduct(context, productId, payload);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function activateProductAction(
  productId: string
): Promise<AuthActionResult<ProductDetailView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.activateProduct(context, productId);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function suspendProductAction(
  productId: string
): Promise<AuthActionResult<ProductDetailView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.suspendProduct(context, productId);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveProductAction(
  productId: string
): Promise<AuthActionResult<ProductDetailView>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.archiveProduct(context, productId);
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function validateProductCodeAction(
  productCode: string,
  excludeProductId?: string
): Promise<AuthActionResult<{ available: boolean }>> {
  try {
    const context = await requireProductContext();
    const service = createProductService();
    const data = await service.validateProductCode(
      context,
      productCode,
      excludeProductId
    );
    return { success: true, data };
  } catch (error) {
    return toActionError(error);
  }
}
