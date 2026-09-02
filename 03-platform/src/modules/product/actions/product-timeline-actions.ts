"use server";

/**
 * Purpose:
 * Product Timeline server actions.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { requireProductChannelContext as requireContext } from "@/core/channel-experience/helpers/domain-channel-entry";
import type { AuthActionResult } from "@/core/auth/actions/auth-actions";
import type { ProductTimelinePanelView } from "@/core/product-timeline";
import { ProductError } from "@/modules/product/errors";
import { createProductTimelineQueryService } from "@/modules/product/services/product-timeline-query-service";
import type { ProductTimelineListFiltersInput } from "@/modules/product/validators/product-timeline-validators";


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
  console.error("[product-timeline-actions] Unexpected error", error);
  return {
    success: false,
    error: {
      code: "PROVIDER_ERROR",
      message: "We could not load the product timeline.",
    },
  };
}

export async function listProductTimelineAction(
  productId: string,
  filters: ProductTimelineListFiltersInput = {}
): Promise<AuthActionResult<ProductTimelinePanelView>> {
  try {
    const context = await requireContext();
    const service = createProductTimelineQueryService();
    const data = await service.getTimelinePanel(context, productId, filters);
    return { success: true, data };
  } catch (error) {
    return toError(error);
  }
}

export async function loadMoreProductTimelineAction(
  productId: string,
  filters: ProductTimelineListFiltersInput
): Promise<AuthActionResult<ProductTimelinePanelView>> {
  return listProductTimelineAction(productId, filters);
}
