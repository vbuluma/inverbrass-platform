/**
 * Purpose:
 * Unit workspace audit history queries.
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_ENTITY_NAMES, createAuditService } from "@/core/audit";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createUnitRepository } from "@/modules/product/repositories/unit-repository";
import type { UnitAuditHistoryPanelView } from "@/modules/product/types";

export class UnitAuditQueryService {
  constructor(
    private readonly unitRepository = createUnitRepository(),
    private readonly auditService = createAuditService()
  ) {}

  async getAuditPanel(
    context: CurrentBusinessContext,
    unitId: string,
    filters: { limit?: number; offset?: number } = { limit: 25, offset: 0 }
  ): Promise<UnitAuditHistoryPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const unit = await this.unitRepository.findById(context.businessId, unitId);

    if (!unit) {
      throw new ProductError(
        "UNIT_NOT_FOUND",
        msg.UNIT_NOT_FOUND,
        404
      );
    }

    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [result, filterOptions] = await Promise.all([
      this.auditService.listByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.UNIT_OF_MEASURE,
        unitId,
        { limit, offset }
      ),
      this.auditService.getFilterOptionsByEntityId(
        context.businessId,
        AUDIT_ENTITY_NAMES.UNIT_OF_MEASURE,
        unitId
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

export function createUnitAuditQueryService() {
  return new UnitAuditQueryService();
}
