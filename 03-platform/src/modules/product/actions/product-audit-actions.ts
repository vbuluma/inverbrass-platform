"use server";

/**
 * Purpose:
 * Product Audit History server actions.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import { createAuthService } from "@/core/auth/services/auth-service";
import { createBusinessContextService } from "@/core/auth/services/business-context-service";
import type { AuditHistoryDetailView } from "@/core/audit/types";
import { createAuditService } from "@/core/audit";
import { ProductError } from "@/modules/product/errors";
import { createProductAuditQueryService } from "@/modules/product/services/product-audit-query-service";
import type { ProductAuditHistoryPanelView } from "@/modules/product/types";
import type { ProductAuditListFiltersInput } from "@/modules/product/validators/product-audit-validators";

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

function toError(error: unknown): AuthActionResult<never> {
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
  console.error("[product-audit-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not load the product audit history.",
    },
  };
}

export async function listProductAuditHistoryAction(
  productId: string,
  filters: ProductAuditListFiltersInput = {}
): Promise<AuthActionResult<ProductAuditHistoryPanelView>> {
  try {
    const context = await requireContext();
    const service = createProductAuditQueryService();
    const data = await service.getAuditPanel(context, productId, filters);
    return { success: true, data };
  } catch (error) {
    return toError(error);
  }
}

export async function loadMoreProductAuditHistoryAction(
  productId: string,
  filters: ProductAuditListFiltersInput
): Promise<AuthActionResult<ProductAuditHistoryPanelView>> {
  return listProductAuditHistoryAction(productId, filters);
}

export async function getProductAuditDetailAction(
  auditId: string
): Promise<AuthActionResult<AuditHistoryDetailView>> {
  try {
    const context = await requireContext();
    const auditService = createAuditService();
    const data = await auditService.getEntryDetail(context.businessId, auditId);
    if (!data) {
      return {
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Audit entry not found.",
        },
      };
    }
    return { success: true, data };
  } catch (error) {
    return toError(error);
  }
}
