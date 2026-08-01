/**
 * Purpose:
 * Variant workspace audit history queries.
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_ENTITY_NAMES, createAuditService } from "@/core/audit";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductVariantRepository } from "@/modules/product/repositories/product-variant-repository";
import type { VariantAuditHistoryPanelView } from "@/modules/product/types";

export class ProductVariantAuditQueryService {
  constructor(
    private readonly variantRepository = createProductVariantRepository(),
    private readonly auditService = createAuditService()
  ) {}

  async getAuditPanel(
    context: CurrentBusinessContext,
    variantId: string,
    filters: { limit?: number; offset?: number } = { limit: 25, offset: 0 }
  ): Promise<VariantAuditHistoryPanelView> {
    const variant = await this.variantRepository.findById(
      context.businessId,
      variantId
    );

    if (!variant) {
      throw new ProductError(
        "VARIANT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.VARIANT_NOT_FOUND,
        404
      );
    }

    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [result, filterOptions] = await Promise.all([
      this.auditService.listByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
        variantId,
        { limit, offset }
      ),
      this.auditService.getFilterOptionsByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
        variantId
      ),
    ]);

    return {
      entries: result.entries,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
      pageSize: result.pageSize,
      offset: result.offset,
      filterOptions,
    };
  }
}

export function createProductVariantAuditQueryService() {
  return new ProductVariantAuditQueryService();
}
