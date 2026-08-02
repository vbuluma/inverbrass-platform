/**
 * Purpose:
 * Product attribute value assignments — load, validate, save, and search.
 *
 * Architecture:
 * Server Actions → AttributeAssignmentService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-004 – Product Attributes Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
  PRODUCT_TIMELINE_SOURCE_MODULES,
} from "@/core/product-timeline";
import {
  ATTRIBUTE_DEFINITION_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createAttributeAssignmentRepository } from "@/modules/product/repositories/attribute-assignment-repository";
import { createAttributeDefinitionRepository } from "@/modules/product/repositories/attribute-definition-repository";
import { createAttributeGroupRepository } from "@/modules/product/repositories/attribute-group-repository";
import { createAttributeOptionRepository } from "@/modules/product/repositories/attribute-option-repository";
import { createAttributeScopeRepository } from "@/modules/product/repositories/attribute-scope-repository";
import { createProductClassificationAssignmentRepository } from "@/modules/product/repositories/product-classification-assignment-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import {
  attributeDataTypeLabel,
  attributeDefinitionStatusLabel,
  attributeGroupStatusLabel,
} from "@/modules/product/services/attribute-rules";
import { validateAttributeValues } from "@/modules/product/services/attribute-validation-service";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import type {
  AttributeDefinitionView,
  AttributeGroupView,
  AttributeOptionView,
  ProductAttributeFieldView,
  ProductAttributesPanelView,
  ProductSummaryView,
  SaveProductAttributeValuesPayload,
  SearchProductsByAttributePayload,
} from "@/modules/product/types";
import {
  saveProductAttributeValuesSchema,
  searchProductsByAttributeSchema,
} from "@/modules/product/validators/attribute-validators";

export class AttributeAssignmentService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly definitionRepository = createAttributeDefinitionRepository(),
    private readonly groupRepository = createAttributeGroupRepository(),
    private readonly optionRepository = createAttributeOptionRepository(),
    private readonly scopeRepository = createAttributeScopeRepository(),
    private readonly assignmentRepository = createAttributeAssignmentRepository(),
    private readonly classificationAssignmentRepository =
      createProductClassificationAssignmentRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getProductAttributesPanel(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductAttributesPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const product = await this.productRepository.findById(
      context.businessId,
      productId
    );

    if (!product) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        msg.PRODUCT_NOT_FOUND,
        404
      );
    }

    const applicableDefinitions = await this.resolveApplicableDefinitions(
      context.businessId,
      productId,
      product.productTypeCode
    );

    const [assignments, groups] = await Promise.all([
      this.assignmentRepository.listByProductId(context.businessId, productId),
      this.groupRepository.listByBusinessId(context.businessId),
    ]);

    const assignmentByDefinitionId = new Map(
      assignments.map((row) => [row.definition.id, row.assignment])
    );

    const groupMap = new Map(
      groups.map((group) => [
        group.id,
        {
          ...this.mapGroupView(group),
          definitionCount: 0,
        },
      ])
    );

    const fieldsByGroup = new Map<string, ProductAttributeFieldView[]>();

    for (const definition of applicableDefinitions) {
      if (definition.isHidden) {
        continue;
      }

      const options = await this.optionRepository.listByDefinitionId(definition.id);
      const assignment = assignmentByDefinitionId.get(definition.id);

      const field: ProductAttributeFieldView = {
        definition,
        options: options.map((option) => this.mapOptionView(option)),
        value: assignment?.attributeValue ?? definition.defaultValue ?? null,
        assignmentId: assignment?.id ?? null,
        version: assignment?.version ?? null,
      };

      const existing = fieldsByGroup.get(definition.attributeGroupId) ?? [];
      existing.push(field);
      fieldsByGroup.set(definition.attributeGroupId, existing);
    }

    const panelGroups = Array.from(fieldsByGroup.entries())
      .map(([groupId, fields]) => {
        const group = groupMap.get(groupId);
        if (!group) {
          return null;
        }
        return {
          group,
          fields: fields.sort(
            (a, b) =>
              a.definition.displayOrder - b.definition.displayOrder ||
              a.definition.name.localeCompare(b.definition.name)
          ),
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .sort((a, b) => a.group.displayOrder - b.group.displayOrder);

    return {
      productId,
      groups: panelGroups,
    };
  }

  async saveProductAttributeValues(
    context: CurrentBusinessContext,
    productId: string,
    payload: SaveProductAttributeValuesPayload
  ): Promise<ProductAttributesPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = saveProductAttributeValuesSchema.parse(payload);
    const product = await this.productRepository.findById(
      context.businessId,
      productId
    );

    if (!product) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        msg.PRODUCT_NOT_FOUND,
        404
      );
    }

    const applicableDefinitions = await this.resolveApplicableDefinitions(
      context.businessId,
      productId,
      product.productTypeCode
    );

    const definitionsForValidation = await Promise.all(
      applicableDefinitions.map(async (definition) => ({
        code: definition.code,
        name: definition.name,
        dataType: definition.dataType,
        isMandatory: definition.isMandatory,
        isReadOnly: definition.isReadOnly,
        validationRule: definition.validationRule,
        defaultValue: definition.defaultValue,
        options: (
          await this.optionRepository.listByDefinitionId(definition.id)
        ).map((option) => ({
          optionCode: option.optionCode,
          optionLabel: option.optionLabel,
          status: option.status,
        })),
      }))
    );

    const normalizedValues = validateAttributeValues(
      definitionsForValidation,
      parsed.values
    );

    for (const definition of applicableDefinitions) {
      if (definition.isReadOnly) {
        continue;
      }

      const normalizedValue = normalizedValues[definition.code];
      const existing = await this.assignmentRepository.findByProductAndDefinition(
        context.businessId,
        productId,
        definition.id
      );

      if (existing) {
        const updated = await this.assignmentRepository.update(
          context.businessId,
          existing.id,
          {
            attributeValue: normalizedValue,
            updatedBy: context.platformUserId,
          },
          existing.version
        );

        if (!updated) {
          throw new ProductError(
            "PROVIDER_ERROR",
            "Concurrent update detected. Refresh and try again.",
            409
          );
        }

        await recordProductEntityAudit(this.auditService, context, {
          productId,
          ownerPartyId: product.ownerPartyId,
          entityName: AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_ASSIGNMENT,
          entityId: updated.id,
          operation: AUDIT_OPERATIONS.UPDATE,
          sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
          before: { attributeValue: existing.attributeValue },
          after: { attributeValue: updated.attributeValue },
          trackFields: ["attributeValue"],
        });

        await this.timelineService.recordEvent(
          buildProductTimelineEventFromContext(context, {
            productId,
            eventType: PRODUCT_TIMELINE_EVENT_TYPES.ATTRIBUTE_UPDATED,
            eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
            sourceModule: PRODUCT_TIMELINE_SOURCE_MODULES.PRODUCT_MANAGEMENT,
            summary: `Attribute "${definition.name}" updated`,
            referenceEntity: AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_DEFINITION,
            referenceId: definition.id,
          })
        );
      } else if (normalizedValue !== null && normalizedValue !== undefined) {
        const created = await this.assignmentRepository.insert({
          businessId: context.businessId,
          productId,
          attributeDefinitionId: definition.id,
          attributeValue: normalizedValue,
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        });

        await recordProductEntityAudit(this.auditService, context, {
          productId,
          ownerPartyId: product.ownerPartyId,
          entityName: AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_ASSIGNMENT,
          entityId: created.id,
          operation: AUDIT_OPERATIONS.CREATE,
          sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
          createValues: {
            attributeDefinitionId: definition.id,
            attributeValue: normalizedValue,
          },
        });

        await this.timelineService.recordEvent(
          buildProductTimelineEventFromContext(context, {
            productId,
            eventType: PRODUCT_TIMELINE_EVENT_TYPES.ATTRIBUTE_ASSIGNED,
            eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
            sourceModule: PRODUCT_TIMELINE_SOURCE_MODULES.PRODUCT_MANAGEMENT,
            summary: `Attribute "${definition.name}" assigned`,
            referenceEntity: AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_DEFINITION,
            referenceId: definition.id,
          })
        );
      }
    }

    return this.getProductAttributesPanel(context, productId);
  }

  async searchProductsByAttribute(
    context: CurrentBusinessContext,
    payload: SearchProductsByAttributePayload
  ): Promise<ProductSummaryView[]> {
    const parsed = searchProductsByAttributeSchema.parse(payload);
    const rows = await this.assignmentRepository.searchByAttributeValue(
      context.businessId,
      parsed.attributeCode.trim().toUpperCase(),
      parsed.attributeValue
    );

    const productIds = [...new Set(rows.map((row) => row.assignment.productId))];
    const products = await Promise.all(
      productIds.map((id) =>
        this.productRepository.findById(context.businessId, id)
      )
    );

    return products
      .filter((product): product is NonNullable<typeof product> => product !== null)
      .map((product) => ({
        id: product.id,
        productCode: product.productCode,
        productName: product.productName,
        shortName: product.shortName,
        productTypeCode: product.productTypeCode,
        productTypeName: product.productTypeCode,
        statusCode: product.statusCode,
        statusName: product.statusCode,
        ownerPartyId: product.ownerPartyId,
        ownerDisplayName: null,
        recordSource: product.recordSource,
        recordSourceLabel: product.recordSource,
        updatedAt: product.updatedAt.toISOString(),
        createdAt: product.createdAt.toISOString(),
      }));
  }

  private async resolveApplicableDefinitions(
    businessId: string,
    productId: string,
    productTypeCode: string
  ): Promise<AttributeDefinitionView[]> {
    const [typeScopes, classificationAssignments, allDefinitions] =
      await Promise.all([
        this.scopeRepository.listByProductType(businessId, productTypeCode),
        this.classificationAssignmentRepository.listActiveByProductId(
          businessId,
          productId
        ),
        this.definitionRepository.listByBusinessId(businessId, {
          status: ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE,
        }),
      ]);

    const scopedDefinitionIds = new Set<string>();

    for (const scope of typeScopes) {
      scopedDefinitionIds.add(scope.attributeDefinitionId);
    }

    for (const row of classificationAssignments) {
      const classScopes = await this.scopeRepository.listByClassificationId(
        businessId,
        row.assignment.classificationId
      );
      for (const scope of classScopes) {
        scopedDefinitionIds.add(scope.attributeDefinitionId);
      }
    }

    return allDefinitions
      .filter((row) => scopedDefinitionIds.has(row.definition.id))
      .map((row) =>
        this.mapDefinitionView(row.definition, row.groupCode, row.groupName)
      );
  }

  private mapGroupView(group: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    displayOrder: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  }): AttributeGroupView {
    return {
      id: group.id,
      code: group.code,
      name: group.name,
      description: group.description,
      displayOrder: group.displayOrder,
      status: group.status,
      statusLabel: attributeGroupStatusLabel(group.status),
      definitionCount: 0,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      version: group.version,
    };
  }

  private mapDefinitionView(
    definition: {
      id: string;
      attributeGroupId: string;
      code: string;
      name: string;
      description: string | null;
      dataType: string;
      validationRule: unknown;
      defaultValue: string | null;
      displayOrder: number;
      isMandatory: boolean;
      isReadOnly: boolean;
      isHidden: boolean;
      status: string;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    },
    groupCode: string,
    groupName: string
  ): AttributeDefinitionView {
    return {
      id: definition.id,
      attributeGroupId: definition.attributeGroupId,
      groupCode,
      groupName,
      code: definition.code,
      name: definition.name,
      description: definition.description,
      dataType: definition.dataType,
      dataTypeLabel: attributeDataTypeLabel(definition.dataType),
      validationRule: (definition.validationRule as Record<string, unknown>) ?? null,
      defaultValue: definition.defaultValue,
      displayOrder: definition.displayOrder,
      isMandatory: definition.isMandatory,
      isReadOnly: definition.isReadOnly,
      isHidden: definition.isHidden,
      status: definition.status,
      statusLabel: attributeDefinitionStatusLabel(definition.status),
      createdAt: definition.createdAt.toISOString(),
      updatedAt: definition.updatedAt.toISOString(),
      version: definition.version,
    };
  }

  private mapOptionView(option: {
    id: string;
    optionCode: string;
    optionLabel: string;
    displayOrder: number;
    status: string;
    version: number;
  }): AttributeOptionView {
    return {
      id: option.id,
      optionCode: option.optionCode,
      optionLabel: option.optionLabel,
      displayOrder: option.displayOrder,
      status: option.status,
      version: option.version,
    };
  }
}

export function createAttributeAssignmentService() {
  return new AttributeAssignmentService();
}
