/**
 * Purpose:
 * Attribute workspace audit history queries.
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { AUDIT_ENTITY_NAMES, createAuditService } from "@/core/audit";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createAttributeDefinitionRepository } from "@/modules/product/repositories/attribute-definition-repository";
import { createAttributeGroupRepository } from "@/modules/product/repositories/attribute-group-repository";
import type { AttributeAuditHistoryPanelView } from "@/modules/product/types";

export class AttributeAuditQueryService {
  constructor(
    private readonly groupRepository = createAttributeGroupRepository(),
    private readonly definitionRepository = createAttributeDefinitionRepository(),
    private readonly auditService = createAuditService()
  ) {}

  async getGroupAuditPanel(
    context: CurrentBusinessContext,
    groupId: string,
    filters: { limit?: number; offset?: number } = { limit: 25, offset: 0 }
  ): Promise<AttributeAuditHistoryPanelView> {
    const group = await this.groupRepository.findById(context.businessId, groupId);
    if (!group) {
      throw new ProductError(
        "ATTRIBUTE_GROUP_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_GROUP_NOT_FOUND,
        404
      );
    }

    return this.loadAuditPanel(
      context.businessId,
      AUDIT_ENTITY_NAMES.ATTRIBUTE_GROUP,
      groupId,
      filters
    );
  }

  async getDefinitionAuditPanel(
    context: CurrentBusinessContext,
    definitionId: string,
    filters: { limit?: number; offset?: number } = { limit: 25, offset: 0 }
  ): Promise<AttributeAuditHistoryPanelView> {
    const definition = await this.definitionRepository.findById(
      context.businessId,
      definitionId
    );
    if (!definition) {
      throw new ProductError(
        "ATTRIBUTE_DEFINITION_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_DEFINITION_NOT_FOUND,
        404
      );
    }

    return this.loadAuditPanel(
      context.businessId,
      AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_DEFINITION,
      definitionId,
      filters
    );
  }

  private async loadAuditPanel(
    businessId: string,
    entityName: string,
    entityId: string,
    filters: { limit?: number; offset?: number }
  ): Promise<AttributeAuditHistoryPanelView> {
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;

    const [result, filterOptions] = await Promise.all([
      this.auditService.listByEntityId(businessId, entityName, entityId, {
        limit,
        offset,
      }),
      this.auditService.getFilterOptionsByEntityId(
        businessId,
        entityName,
        entityId
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

export function createAttributeAuditQueryService() {
  return new AttributeAuditQueryService();
}
