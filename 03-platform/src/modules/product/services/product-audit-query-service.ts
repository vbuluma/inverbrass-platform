/**
 * Purpose:
 * Product Workspace Audit History tab — list and filter immutable change records.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  createAuditService,
} from "@/core/audit";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import type { ProductAuditHistoryPanelView } from "@/modules/product/types";
import {
  productAuditListFiltersSchema,
  type ProductAuditListFiltersInput,
} from "@/modules/product/validators/product-audit-validators";

export class ProductAuditQueryService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly auditService = createAuditService()
  ) {}

  async getAuditPanel(
    context: CurrentBusinessContext,
    productId: string,
    filters: ProductAuditListFiltersInput = { limit: 25, offset: 0 }
  ): Promise<ProductAuditHistoryPanelView> {
    const parsed = productAuditListFiltersSchema.safeParse(filters);
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
      this.auditService.listByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.PRODUCT,
        productId,
        parsed.data
      ),
      this.auditService.getFilterOptionsByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.PRODUCT,
        productId
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

export function createProductAuditQueryService(): ProductAuditQueryService {
  return new ProductAuditQueryService();
}
