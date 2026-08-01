/**
 * Purpose:
 * Product Attributes Engine — groups, definitions, options, scope, and search.
 *
 * Architecture:
 * Server Actions → AttributeDefinitionService → Repositories → Drizzle
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
  ATTRIBUTE_TIMELINE_EVENT_CATEGORIES,
  ATTRIBUTE_TIMELINE_EVENT_TYPES,
  ATTRIBUTE_TIMELINE_SOURCE_MODULES,
  buildAttributeTimelineEventFromContext,
  createAttributeTimelineService,
} from "@/core/attribute-timeline";
import { filterAttributeGroupsForIndustry } from "@/core/industry-experience/attribute-group-filters";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import {
  ATTRIBUTE_DATA_TYPES,
  ATTRIBUTE_DEFINITION_STATUS_CODES,
  ATTRIBUTE_OPTION_STATUS_CODES,
  ATTRIBUTE_SCOPE_TYPES,
} from "@/modules/product/constants";
import { ProductError, PRODUCT_USER_MESSAGES } from "@/modules/product/errors";
import { createAttributeDefinitionRepository } from "@/modules/product/repositories/attribute-definition-repository";
import { createAttributeGroupRepository } from "@/modules/product/repositories/attribute-group-repository";
import { createAttributeOptionRepository } from "@/modules/product/repositories/attribute-option-repository";
import { createAttributeScopeRepository } from "@/modules/product/repositories/attribute-scope-repository";
import { createAttributeAuditQueryService } from "@/modules/product/services/attribute-audit-query-service";
import {
  attributeDataTypeLabel,
  attributeDefinitionStatusLabel,
  attributeGroupStatusLabel,
  canTransitionAttributeDefinitionStatus,
  canTransitionAttributeGroupStatus,
  dataTypeSupportsOptions,
  isAttributeDefinitionAssignable,
  isAttributeDefinitionEditable,
  isValidAttributeDataType,
  mergeValidationRule,
  normalizeAttributeCode,
  normalizeAttributeGroupCode,
  resolveDefaultAttributeDefinitionStatus,
  resolveDefaultAttributeGroupStatus,
} from "@/modules/product/services/attribute-rules";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import { createProductClassificationRepository } from "@/modules/product/repositories/product-classification-repository";
import { createProductReferenceRepository } from "@/modules/product/repositories/product-reference-repository";
import type {
  AssignAttributeScopePayload,
  AttributeDashboardView,
  AttributeDefinitionView,
  AttributeDefinitionWorkspaceView,
  AttributeGroupView,
  AttributeGroupWorkspaceView,
  AttributeOptionView,
  AttributeScopeView,
  CreateAttributeDefinitionPayload,
  CreateAttributeGroupPayload,
  CreateAttributeOptionPayload,
  SearchAttributesPayload,
  UpdateAttributeDefinitionPayload,
  UpdateAttributeGroupPayload,
  UpdateAttributeOptionPayload,
} from "@/modules/product/types";
import {
  assignAttributeScopeSchema,
  createAttributeDefinitionSchema,
  createAttributeGroupSchema,
  createAttributeOptionSchema,
  searchAttributesSchema,
  updateAttributeDefinitionSchema,
  updateAttributeGroupSchema,
  updateAttributeOptionSchema,
} from "@/modules/product/validators/attribute-validators";

export class AttributeDefinitionService {
  constructor(
    private readonly groupRepository = createAttributeGroupRepository(),
    private readonly definitionRepository = createAttributeDefinitionRepository(),
    private readonly optionRepository = createAttributeOptionRepository(),
    private readonly scopeRepository = createAttributeScopeRepository(),
    private readonly classificationRepository = createProductClassificationRepository(),
    private readonly referenceRepository = createProductReferenceRepository(),
    private readonly timelineService = createAttributeTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly auditQueryService = createAttributeAuditQueryService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getDashboard(context: CurrentBusinessContext): Promise<AttributeDashboardView> {
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const [groups, definitionRows, activeCount, archivedCount] = await Promise.all([
      this.groupRepository.listByBusinessId(context.businessId),
      this.definitionRepository.listByBusinessId(context.businessId),
      this.definitionRepository.countByStatus(
        context.businessId,
        ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE
      ),
      this.definitionRepository.countByStatus(
        context.businessId,
        ATTRIBUTE_DEFINITION_STATUS_CODES.ARCHIVED
      ),
    ]);

    const definitions = definitionRows.map((row) =>
      this.mapDefinitionView(row.definition, row.groupCode, row.groupName)
    );

    const groupViews = groups.map((group) => ({
      ...this.mapGroupView(group),
      definitionCount: definitions.filter(
        (definition) => definition.attributeGroupId === group.id
      ).length,
    }));

    const filteredGroups = filterAttributeGroupsForIndustry(
      groupViews,
      profile.industryCode
    );

    return {
      totalGroups: filteredGroups.length,
      totalAttributes: definitions.length,
      activeAttributes: activeCount,
      archivedAttributes: archivedCount,
      recentlyUpdated: definitions
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 8),
      groups: filteredGroups,
      definitions,
      dataTypes: Object.values(ATTRIBUTE_DATA_TYPES).map((code) => ({
        code,
        label: attributeDataTypeLabel(code),
      })),
      catalogueLabel: profile.offeringCatalogueNavLabel ?? "Products",
      industryCode: profile.industryCode,
    };
  }

  async createGroup(
    context: CurrentBusinessContext,
    payload: CreateAttributeGroupPayload
  ): Promise<AttributeGroupView> {
    const parsed = createAttributeGroupSchema.parse(payload);
    const code = normalizeAttributeGroupCode(parsed.code);

    const existing = await this.groupRepository.findByCode(context.businessId, code);
    if (existing) {
      throw new ProductError(
        "DUPLICATE_ATTRIBUTE_GROUP_CODE",
        PRODUCT_USER_MESSAGES.DUPLICATE_ATTRIBUTE_GROUP_CODE,
        409,
        "code"
      );
    }

    const row = await this.groupRepository.insert({
      businessId: context.businessId,
      code,
      name: parsed.name.trim(),
      description: parsed.description?.trim() ?? null,
      displayOrder: parsed.displayOrder ?? 0,
      status: parsed.status ?? resolveDefaultAttributeGroupStatus(),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: row.id,
      entityName: AUDIT_ENTITY_NAMES.ATTRIBUTE_GROUP,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        code: row.code,
        name: row.name,
        status: row.status,
      },
    });

    return { ...this.mapGroupView(row), definitionCount: 0 };
  }

  async updateGroup(
    context: CurrentBusinessContext,
    groupId: string,
    payload: UpdateAttributeGroupPayload
  ): Promise<AttributeGroupView> {
    const parsed = updateAttributeGroupSchema.parse(payload);
    const existing = await this.groupRepository.findById(context.businessId, groupId);

    if (!existing) {
      throw new ProductError(
        "ATTRIBUTE_GROUP_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_GROUP_NOT_FOUND,
        404
      );
    }

    if (
      parsed.status &&
      !canTransitionAttributeGroupStatus(existing.status, parsed.status)
    ) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_STATUS_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_ATTRIBUTE_STATUS_TRANSITION,
        400,
        "status"
      );
    }

    const updated = await this.groupRepository.update(
      context.businessId,
      groupId,
      {
        name: parsed.name?.trim(),
        description: parsed.description?.trim(),
        displayOrder: parsed.displayOrder,
        status: parsed.status,
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
      productId: groupId,
      entityName: AUDIT_ENTITY_NAMES.ATTRIBUTE_GROUP,
      entityId: groupId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: existing,
      after: updated,
      trackFields: ["name", "description", "displayOrder", "status"],
    });

    const definitions = await this.definitionRepository.listByGroupId(
      context.businessId,
      groupId
    );

    return {
      ...this.mapGroupView(updated),
      definitionCount: definitions.length,
    };
  }

  async getGroupWorkspace(
    context: CurrentBusinessContext,
    groupId: string
  ): Promise<AttributeGroupWorkspaceView> {
    const group = await this.groupRepository.findById(context.businessId, groupId);
    if (!group) {
      throw new ProductError(
        "ATTRIBUTE_GROUP_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_GROUP_NOT_FOUND,
        404
      );
    }

    const [definitions, audit] = await Promise.all([
      this.definitionRepository.listByGroupId(context.businessId, groupId),
      this.auditQueryService.getGroupAuditPanel(context, groupId),
    ]);

    return {
      group: {
        ...this.mapGroupView(group),
        definitionCount: definitions.length,
      },
      definitions: definitions.map((definition) =>
        this.mapDefinitionView(definition, group.code, group.name)
      ),
      timeline: { events: [], totalCount: 0, hasMore: false, pageSize: 20, offset: 0 },
      audit,
    };
  }

  async createDefinition(
    context: CurrentBusinessContext,
    payload: CreateAttributeDefinitionPayload
  ): Promise<AttributeDefinitionView> {
    const parsed = createAttributeDefinitionSchema.parse(payload);

    if (!isValidAttributeDataType(parsed.dataType)) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_DATA_TYPE",
        PRODUCT_USER_MESSAGES.INVALID_ATTRIBUTE_DATA_TYPE,
        400,
        "dataType"
      );
    }

    const group = await this.groupRepository.findById(
      context.businessId,
      parsed.attributeGroupId
    );
    if (!group) {
      throw new ProductError(
        "ATTRIBUTE_GROUP_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_GROUP_NOT_FOUND,
        404,
        "attributeGroupId"
      );
    }

    const code = normalizeAttributeCode(parsed.code);
    const [existingCode, existingName] = await Promise.all([
      this.definitionRepository.findByCode(context.businessId, code),
      this.definitionRepository.findByNameInGroup(
        context.businessId,
        parsed.attributeGroupId,
        parsed.name.trim()
      ),
    ]);

    if (existingCode) {
      throw new ProductError(
        "DUPLICATE_ATTRIBUTE_CODE",
        PRODUCT_USER_MESSAGES.DUPLICATE_ATTRIBUTE_CODE,
        409,
        "code"
      );
    }

    if (existingName) {
      throw new ProductError(
        "DUPLICATE_ATTRIBUTE_NAME_IN_GROUP",
        PRODUCT_USER_MESSAGES.DUPLICATE_ATTRIBUTE_NAME_IN_GROUP,
        409,
        "name"
      );
    }

    const validationRule = mergeValidationRule(
      parsed.validationRule ?? null,
      parsed.isMandatory ?? false
    );

    const row = await this.definitionRepository.insert({
      businessId: context.businessId,
      attributeGroupId: parsed.attributeGroupId,
      code,
      name: parsed.name.trim(),
      description: parsed.description?.trim() ?? null,
      dataType: parsed.dataType,
      validationRule,
      defaultValue: parsed.defaultValue ?? null,
      displayOrder: parsed.displayOrder ?? 0,
      isMandatory: parsed.isMandatory ?? false,
      isReadOnly: parsed.isReadOnly ?? false,
      isHidden: parsed.isHidden ?? false,
      status: parsed.status ?? resolveDefaultAttributeDefinitionStatus(),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.timelineService.recordEvent(
      buildAttributeTimelineEventFromContext(context, {
        attributeDefinitionId: row.id,
        eventType: ATTRIBUTE_TIMELINE_EVENT_TYPES.ATTRIBUTE_CREATED,
        eventCategory: ATTRIBUTE_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        sourceModule: ATTRIBUTE_TIMELINE_SOURCE_MODULES.PRODUCT_ATTRIBUTES,
        summary: `Attribute "${row.name}" created`,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: row.id,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_DEFINITION,
      entityId: row.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        code: row.code,
        name: row.name,
        dataType: row.dataType,
        status: row.status,
      },
    });

    return this.mapDefinitionView(row, group.code, group.name);
  }

  async updateDefinition(
    context: CurrentBusinessContext,
    definitionId: string,
    payload: UpdateAttributeDefinitionPayload
  ): Promise<AttributeDefinitionView> {
    const parsed = updateAttributeDefinitionSchema.parse(payload);
    const existing = await this.definitionRepository.findById(
      context.businessId,
      definitionId
    );

    if (!existing) {
      throw new ProductError(
        "ATTRIBUTE_DEFINITION_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_DEFINITION_NOT_FOUND,
        404
      );
    }

    if (!isAttributeDefinitionEditable(existing.status)) {
      throw new ProductError(
        "ARCHIVED_ATTRIBUTE_IMMUTABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_ATTRIBUTE_IMMUTABLE,
        400
      );
    }

    if (
      parsed.status &&
      !canTransitionAttributeDefinitionStatus(existing.status, parsed.status)
    ) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_STATUS_TRANSITION",
        PRODUCT_USER_MESSAGES.INVALID_ATTRIBUTE_STATUS_TRANSITION,
        400,
        "status"
      );
    }

    if (parsed.dataType && !isValidAttributeDataType(parsed.dataType)) {
      throw new ProductError(
        "INVALID_ATTRIBUTE_DATA_TYPE",
        PRODUCT_USER_MESSAGES.INVALID_ATTRIBUTE_DATA_TYPE,
        400,
        "dataType"
      );
    }

    const group = await this.groupRepository.findById(
      context.businessId,
      existing.attributeGroupId
    );

    const validationRule =
      parsed.validationRule !== undefined || parsed.isMandatory !== undefined
        ? mergeValidationRule(
            parsed.validationRule ?? (existing.validationRule as Record<string, unknown> | null),
            parsed.isMandatory ?? existing.isMandatory
          )
        : undefined;

    const updated = await this.definitionRepository.update(
      context.businessId,
      definitionId,
      {
        name: parsed.name?.trim(),
        description: parsed.description?.trim(),
        dataType: parsed.dataType,
        validationRule,
        defaultValue: parsed.defaultValue,
        displayOrder: parsed.displayOrder,
        isMandatory: parsed.isMandatory,
        isReadOnly: parsed.isReadOnly,
        isHidden: parsed.isHidden,
        status: parsed.status,
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

    const eventType =
      parsed.validationRule !== undefined || parsed.isMandatory !== undefined
        ? ATTRIBUTE_TIMELINE_EVENT_TYPES.VALIDATION_CHANGED
        : ATTRIBUTE_TIMELINE_EVENT_TYPES.ATTRIBUTE_UPDATED;

    await this.timelineService.recordEvent(
      buildAttributeTimelineEventFromContext(context, {
        attributeDefinitionId: definitionId,
        eventType,
        eventCategory: ATTRIBUTE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
        sourceModule: ATTRIBUTE_TIMELINE_SOURCE_MODULES.PRODUCT_ATTRIBUTES,
        summary: `Attribute "${updated.name}" updated`,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: definitionId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_ATTRIBUTE_DEFINITION,
      entityId: definitionId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: existing,
      after: updated,
      trackFields: [
        "name",
        "dataType",
        "validationRule",
        "isMandatory",
        "isReadOnly",
        "isHidden",
        "status",
      ],
    });

    return this.mapDefinitionView(
      updated,
      group?.code ?? "",
      group?.name ?? ""
    );
  }

  async getDefinitionWorkspace(
    context: CurrentBusinessContext,
    definitionId: string
  ): Promise<AttributeDefinitionWorkspaceView> {
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

    const group = await this.groupRepository.findById(
      context.businessId,
      definition.attributeGroupId
    );

    const [options, scopes, productTypes, classifications, timeline, audit] =
      await Promise.all([
        this.optionRepository.listByDefinitionId(definitionId),
        this.scopeRepository.listByDefinitionId(context.businessId, definitionId),
        this.referenceRepository.listActiveProductTypes(),
        this.classificationRepository.listByBusinessId(context.businessId),
        this.timelineService.getTimelinePanel(context.businessId, definitionId),
        this.auditQueryService.getDefinitionAuditPanel(context, definitionId),
      ]);

    return {
      definition: this.mapDefinitionView(
        definition,
        group?.code ?? "",
        group?.name ?? ""
      ),
      options: options.map((option) => this.mapOptionView(option)),
      scopes: scopes.map((scope) => this.mapScopeView(scope)),
      productTypes: productTypes.map((type) => ({
        code: type.code,
        name: type.name,
        description: type.description,
      })),
      classifications: classifications.map((node) => ({
        id: node.id,
        code: node.code,
        name: node.name,
      })),
      timeline,
      audit,
    };
  }

  async createOption(
    context: CurrentBusinessContext,
    definitionId: string,
    payload: CreateAttributeOptionPayload
  ): Promise<AttributeOptionView> {
    const parsed = createAttributeOptionSchema.parse(payload);
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

    if (!dataTypeSupportsOptions(definition.dataType)) {
      throw new ProductError(
        "OPTIONS_NOT_ALLOWED_FOR_DATA_TYPE",
        PRODUCT_USER_MESSAGES.OPTIONS_NOT_ALLOWED_FOR_DATA_TYPE,
        400
      );
    }

    const existing = await this.optionRepository.findByCode(
      definitionId,
      parsed.optionCode.trim().toUpperCase()
    );
    if (existing) {
      throw new ProductError(
        "DUPLICATE_ATTRIBUTE_OPTION_CODE",
        PRODUCT_USER_MESSAGES.DUPLICATE_ATTRIBUTE_OPTION_CODE,
        409,
        "optionCode"
      );
    }

    const row = await this.optionRepository.insert({
      attributeDefinitionId: definitionId,
      optionCode: parsed.optionCode.trim().toUpperCase(),
      optionLabel: parsed.optionLabel.trim(),
      displayOrder: parsed.displayOrder ?? 0,
      status: parsed.status ?? ATTRIBUTE_OPTION_STATUS_CODES.ACTIVE,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.timelineService.recordEvent(
      buildAttributeTimelineEventFromContext(context, {
        attributeDefinitionId: definitionId,
        eventType: ATTRIBUTE_TIMELINE_EVENT_TYPES.ATTRIBUTE_OPTION_ADDED,
        eventCategory: ATTRIBUTE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
        sourceModule: ATTRIBUTE_TIMELINE_SOURCE_MODULES.PRODUCT_ATTRIBUTES,
        summary: `Option "${row.optionLabel}" added`,
      })
    );

    return this.mapOptionView(row);
  }

  async updateOption(
    context: CurrentBusinessContext,
    definitionId: string,
    optionId: string,
    payload: UpdateAttributeOptionPayload
  ): Promise<AttributeOptionView> {
    const parsed = updateAttributeOptionSchema.parse(payload);
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

    const existing = await this.optionRepository.findById(optionId);
    if (!existing || existing.attributeDefinitionId !== definitionId) {
      throw new ProductError(
        "ATTRIBUTE_DEFINITION_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_DEFINITION_NOT_FOUND,
        404
      );
    }

    const updated = await this.optionRepository.update(
      optionId,
      {
        optionLabel: parsed.optionLabel?.trim(),
        displayOrder: parsed.displayOrder,
        status: parsed.status,
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

    await this.timelineService.recordEvent(
      buildAttributeTimelineEventFromContext(context, {
        attributeDefinitionId: definitionId,
        eventType: ATTRIBUTE_TIMELINE_EVENT_TYPES.ATTRIBUTE_OPTION_CHANGED,
        eventCategory: ATTRIBUTE_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
        sourceModule: ATTRIBUTE_TIMELINE_SOURCE_MODULES.PRODUCT_ATTRIBUTES,
        summary: `Option "${updated.optionLabel}" updated`,
      })
    );

    return this.mapOptionView(updated);
  }

  async assignScope(
    context: CurrentBusinessContext,
    payload: AssignAttributeScopePayload
  ): Promise<AttributeScopeView> {
    const parsed = assignAttributeScopeSchema.parse(payload);
    const definition = await this.definitionRepository.findById(
      context.businessId,
      parsed.attributeDefinitionId
    );

    if (!definition) {
      throw new ProductError(
        "ATTRIBUTE_DEFINITION_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_DEFINITION_NOT_FOUND,
        404
      );
    }

    if (!isAttributeDefinitionAssignable(definition.status)) {
      throw new ProductError(
        "ARCHIVED_ATTRIBUTE_NOT_ASSIGNABLE",
        PRODUCT_USER_MESSAGES.ARCHIVED_ATTRIBUTE_NOT_ASSIGNABLE,
        400
      );
    }

    const productTypeCode =
      parsed.scopeType === ATTRIBUTE_SCOPE_TYPES.PRODUCT_TYPE
        ? parsed.productTypeCode
        : null;
    const classificationId =
      parsed.scopeType === ATTRIBUTE_SCOPE_TYPES.CLASSIFICATION
        ? parsed.classificationId
        : null;

    const existing = await this.scopeRepository.findExisting(
      context.businessId,
      parsed.attributeDefinitionId,
      parsed.scopeType,
      productTypeCode,
      classificationId
    );

    if (existing) {
      throw new ProductError(
        "DUPLICATE_ATTRIBUTE_SCOPE",
        PRODUCT_USER_MESSAGES.DUPLICATE_ATTRIBUTE_SCOPE,
        409
      );
    }

    const row = await this.scopeRepository.insert({
      businessId: context.businessId,
      attributeDefinitionId: parsed.attributeDefinitionId,
      scopeType: parsed.scopeType,
      productTypeCode,
      classificationId,
      displayOrder: parsed.displayOrder ?? 0,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.timelineService.recordEvent(
      buildAttributeTimelineEventFromContext(context, {
        attributeDefinitionId: parsed.attributeDefinitionId,
        eventType: ATTRIBUTE_TIMELINE_EVENT_TYPES.ATTRIBUTE_ASSIGNED,
        eventCategory: ATTRIBUTE_TIMELINE_EVENT_CATEGORIES.ASSIGNMENT,
        sourceModule: ATTRIBUTE_TIMELINE_SOURCE_MODULES.PRODUCT_ATTRIBUTES,
        summary: `Attribute assigned to ${parsed.scopeType}`,
        referenceEntity: parsed.scopeType,
        referenceId: row.id,
      })
    );

    return this.mapScopeView(row);
  }

  async removeScope(
    context: CurrentBusinessContext,
    scopeId: string
  ): Promise<void> {
    const removed = await this.scopeRepository.softDelete(
      context.businessId,
      scopeId,
      context.platformUserId
    );

    if (!removed) {
      throw new ProductError(
        "ATTRIBUTE_ASSIGNMENT_NOT_FOUND",
        PRODUCT_USER_MESSAGES.ATTRIBUTE_ASSIGNMENT_NOT_FOUND,
        404
      );
    }

    await this.timelineService.recordEvent(
      buildAttributeTimelineEventFromContext(context, {
        attributeDefinitionId: removed.attributeDefinitionId,
        eventType: ATTRIBUTE_TIMELINE_EVENT_TYPES.ATTRIBUTE_REMOVED,
        eventCategory: ATTRIBUTE_TIMELINE_EVENT_CATEGORIES.ASSIGNMENT,
        sourceModule: ATTRIBUTE_TIMELINE_SOURCE_MODULES.PRODUCT_ATTRIBUTES,
        summary: "Attribute scope assignment removed",
        referenceId: scopeId,
      })
    );
  }

  async searchDefinitions(
    context: CurrentBusinessContext,
    payload: SearchAttributesPayload
  ): Promise<AttributeDefinitionView[]> {
    const parsed = searchAttributesSchema.parse(payload);
    const rows = await this.definitionRepository.listByBusinessId(
      context.businessId,
      {
        query: parsed.query,
        groupId: parsed.groupId,
        status: parsed.status,
      }
    );

    return rows.map((row) =>
      this.mapDefinitionView(row.definition, row.groupCode, row.groupName)
    );
  }

  async archiveDefinition(
    context: CurrentBusinessContext,
    definitionId: string
  ): Promise<AttributeDefinitionView> {
    return this.updateDefinition(context, definitionId, {
      status: ATTRIBUTE_DEFINITION_STATUS_CODES.ARCHIVED,
    });
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

  private mapScopeView(scope: {
    id: string;
    scopeType: string;
    productTypeCode: string | null;
    classificationId: string | null;
    displayOrder: number;
  }): AttributeScopeView {
    return {
      id: scope.id,
      scopeType: scope.scopeType,
      productTypeCode: scope.productTypeCode,
      classificationId: scope.classificationId,
      displayOrder: scope.displayOrder,
    };
  }
}

export function createAttributeDefinitionService() {
  return new AttributeDefinitionService();
}
