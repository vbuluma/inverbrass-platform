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
import { localizeTimelinePanelView } from "@/core/product-timeline/timeline-terminology";
import {
  createIndustryExperienceService,
  resolveBusinessTerminology,
} from "@/core/industry-experience";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import {
  productTimelineListFiltersSchema,
  type ProductTimelineListFiltersInput,
} from "@/modules/product/validators/product-timeline-validators";

export class ProductTimelineQueryService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getTimelinePanel(
    context: CurrentBusinessContext,
    productId: string,
    filters: ProductTimelineListFiltersInput = { limit: 20, offset: 0 }
  ): Promise<ProductTimelinePanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = productTimelineListFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireProduct(context, productId, msg);

    const industryContext =
      await this.industryExperienceService.getBusinessIndustryContext(
        context.businessId
      );
    const terminology = resolveBusinessTerminology(industryContext.industryCode);

    const [result, filterOptions] = await Promise.all([
      this.timelineService.listEvents(
        context.businessId,
        productId,
        parsed.data
      ),
      this.timelineService.getFilterOptions(context.businessId, productId),
    ]);

    return localizeTimelinePanelView(
      {
        events: result.events,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        pageSize: result.pageSize,
        offset: result.offset,
        filterOptions,
      },
      terminology
    );
  }

  private async requireProduct(
    context: CurrentBusinessContext,
    productId: string,
    msg: Awaited<ReturnType<typeof resolveProductUserMessagesForContext>>
  ): Promise<void> {
    const row = await this.productRepository.findByIdIncludingArchived(
      context.businessId,
      productId
    );

    if (!row) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        msg.PRODUCT_NOT_FOUND,
        404
      );
    }
  }
}

export function createProductTimelineQueryService(): ProductTimelineQueryService {
  return new ProductTimelineQueryService();
}
