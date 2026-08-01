/**
 * Purpose:
 * Bundle workspace audit history queries.
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_ENTITY_NAMES, createAuditService } from "@/core/audit";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductBundleRepository } from "@/modules/product/repositories/product-bundle-repository";
import type { BundleAuditHistoryPanelView } from "@/modules/product/types";

export class ProductBundleAuditQueryService {
  constructor(
    private readonly bundleRepository = createProductBundleRepository(),
    private readonly auditService = createAuditService()
  ) {}

  async getAuditPanel(
    context: CurrentBusinessContext,
    bundleId: string,
    filters: { limit?: number; offset?: number } = { limit: 25, offset: 0 }
  ): Promise<BundleAuditHistoryPanelView> {
    const bundle = await this.bundleRepository.findById(context.businessId, bundleId);

    if (!bundle) {
      throw new ProductError(
        "BUNDLE_NOT_FOUND",
        PRODUCT_USER_MESSAGES.BUNDLE_NOT_FOUND,
        404
      );
    }

    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [result, filterOptions] = await Promise.all([
      this.auditService.listByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.PRODUCT_BUNDLE,
        bundleId,
        { limit, offset }
      ),
      this.auditService.getFilterOptionsByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.PRODUCT_BUNDLE,
        bundleId
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

export function createProductBundleAuditQueryService() {
  return new ProductBundleAuditQueryService();
}
