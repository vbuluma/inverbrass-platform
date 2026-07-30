/**
 * Purpose:
 * Product Workspace Timeline tab — list and filter activity events.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type { ProductTimelinePanelView } from "@/core/product-timeline";
import { createProductTimelineService } from "@/core/product-timeline";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import {
  productTimelineListFiltersSchema,
  type ProductTimelineListFiltersInput,
} from "@/modules/product/validators/product-timeline-validators";

export class ProductTimelineQueryService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly timelineService = createProductTimelineService()
  ) {}

  async getTimelinePanel(
    context: CurrentBusinessContext,
    productId: string,
    filters: ProductTimelineListFiltersInput = { limit: 20, offset: 0 }
  ): Promise<ProductTimelinePanelView> {
    const parsed = productTimelineListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? PRODUCT_USER_MESSAGES.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireProduct(context, productId);

    const [result, filterOptions] = await Promise.all([
      this.timelineService.listEvents(
        context.businessId,
        productId,
        parsed.data
      ),
      this.timelineService.getFilterOptions(context.businessId, productId),
    ]);

    return {
      events: result.events,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      pageSize: result.pageSize,
      offset: result.offset,
      filterOptions,
    };
  }

  private async requireProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<void> {
    const row = await this.productRepository.findByIdIncludingArchived(
      context.businessId,
      productId
    );

    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.PRODUCT_NOT_FOUND,
        404
      );
    }
  }
}

export function createProductTimelineQueryService(): ProductTimelineQueryService {
  return new ProductTimelineQueryService();
}
