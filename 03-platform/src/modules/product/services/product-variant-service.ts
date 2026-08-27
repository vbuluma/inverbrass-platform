/**
 * Purpose:
 * Product Variants Engine — CRUD, lifecycle, clone, search, and attribute overrides.
 *
 * Architecture:
 * Server Actions → ProductVariantService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import { resolveVariantLabel } from "@/core/industry-experience/variant-terminology";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import { DEFAULT_OFFERING_WORKSPACE_LABEL } from "@/core/industry-experience/offering-terminology";
import {
  buildProductTimelineEventFromContext,
  createProductTimelineService,
  PRODUCT_TIMELINE_EVENT_CATEGORIES,
  PRODUCT_TIMELINE_EVENT_TYPES,
  PRODUCT_TIMELINE_SOURCE_MODULES,
} from "@/core/product-timeline";
import {
  buildVariantTimelineEventFromContext,
  createVariantTimelineService,
  VARIANT_TIMELINE_EVENT_CATEGORIES,
  VARIANT_TIMELINE_EVENT_TYPES,
  VARIANT_TIMELINE_SOURCE_MODULES,
} from "@/core/variant-timeline";
import {
  ATTRIBUTE_DEFINITION_STATUS_CODES,
  PRODUCT_STATUS_CODES,
  VARIANT_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import type { ProductUserMessages } from "@/modules/product/product-user-messages";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createAttributeDefinitionRepository } from "@/modules/product/repositories/attribute-definition-repository";
import { createAttributeOptionRepository } from "@/modules/product/repositories/attribute-option-repository";
import { createAttributeScopeRepository } from "@/modules/product/repositories/attribute-scope-repository";
import { createProductClassificationAssignmentRepository } from "@/modules/product/repositories/product-classification-assignment-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { createProductVariantAttributeRepository } from "@/modules/product/repositories/product-variant-attribute-repository";
import { createProductVariantRepository } from "@/modules/product/repositories/product-variant-repository";
import { attributeDataTypeLabel } from "@/modules/product/services/attribute-rules";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import { createProductVariantAuditQueryService } from "@/modules/product/services/product-variant-audit-query-service";
import {
  buildCloneVariantCode,
  buildCloneVariantName,
  canTransitionVariantStatus,
  isParentProductAvailableForVariants,
  isVariantEditable,
  normalizeVariantCode,
  resolveDefaultVariantStatus,
  variantStatusLabel,
  type VariantAttributePair,
} from "@/modules/product/services/product-variant-rules";
import {
  computeVariantFingerprint,
  validateVariantAttributes,
  type VariantAttributeDefinitionContext,
} from "@/modules/product/services/product-variant-validation-service";
import type {
  CloneVariantPayload,
  CreateVariantPayload,
  ProductAttributeFieldView,
  ProductVariantView,
  ProductVariantsPanelView,
  SearchVariantsPayload,
  UpdateVariantPayload,
  VariantDashboardView,
  VariantRegistrationCataloguesView,
  VariantWorkspaceView,
} from "@/modules/product/types";
import {
  cloneVariantSchema,
  createVariantSchema,
  searchVariantsSchema,
  updateVariantSchema,
} from "@/modules/product/validators/variant-validators";

export class ProductVariantService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly variantRepository = createProductVariantRepository(),
    private readonly variantAttributeRepository = createProductVariantAttributeRepository(),
    private readonly definitionRepository = createAttributeDefinitionRepository(),
    private readonly optionRepository = createAttributeOptionRepository(),
    private readonly scopeRepository = createAttributeScopeRepository(),
    private readonly classificationAssignmentRepository =
      createProductClassificationAssignmentRepository(),
    private readonly variantTimelineService = createVariantTimelineService(),
    private readonly productTimelineService = createProductTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly auditQueryService = createProductVariantAuditQueryService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getDashboard(context: CurrentBusinessContext): Promise<VariantDashboardView> {
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const [rows, activeCount, draftCount, archivedCount, parentCount] =
      await Promise.all([
        this.variantRepository.listByBusinessId(context.businessId),
        this.variantRepository.countByStatus(
          context.businessId,
          VARIANT_STATUS_CODES.ACTIVE
        ),
        this.variantRepository.countByStatus(
          context.businessId,
          VARIANT_STATUS_CODES.DRAFT
        ),
        this.variantRepository.countByStatus(
          context.businessId,
          VARIANT_STATUS_CODES.ARCHIVED
        ),
        this.variantRepository.countDistinctProducts(context.businessId),
      ]);

    const variants = rows.map((row) => this.mapVariantView(row.variant, row.productCode, row.productName));

    return {
      totalVariants: variants.length,
      activeVariants: activeCount,
      draftVariants: draftCount,
      archivedVariants: archivedCount,
      parentOfferingCount: parentCount,
      recentlyUpdated: variants.slice(0, 8),
      variants,
      variantLabel: resolveVariantLabel(profile.industryCode),
      catalogueLabel: profile.offeringWorkspaceLabel ?? DEFAULT_OFFERING_WORKSPACE_LABEL,
      industryCode: profile.industryCode,
    };
  }

  async getRegistrationCatalogues(
    context: CurrentBusinessContext,
    productId?: string
  ): Promise<VariantRegistrationCataloguesView> {
    const msg = await resolveProductUserMessagesForContext(context);

    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const products = await this.productRepository.listByBusinessId(context.businessId, {
      limit: 200,
    });

    const productOptions = products
      .filter((row) => row.statusCode !== PRODUCT_STATUS_CODES.ARCHIVED)
      .map((row) => ({
        id: row.id,
        productCode: row.productCode,
        productName: row.productName,
      }));

    if (!productId) {
      return {
        products: productOptions,
        attributeFields: [],
        defaultStatus: resolveDefaultVariantStatus(),
        variantLabel: resolveVariantLabel(profile.industryCode),
      };
    }

    const product = await this.requireProduct(context, productId);
    this.assertParentAvailable(msg, product.statusCode);

    const attributeFields = await this.buildAttributeFieldsForProduct(
      context.businessId,
      productId,
      product.productTypeCode
    );

    return {
      products: productOptions,
      attributeFields,
      defaultStatus: resolveDefaultVariantStatus(),
      variantLabel: resolveVariantLabel(profile.industryCode),
    };
  }

  async getProductVariantsPanel(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductVariantsPanelView> {
    const product = await this.requireProduct(context, productId);
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const [variantRows, attributeFields] = await Promise.all([
      this.variantRepository.listByProductId(context.businessId, productId),
      this.buildAttributeFieldsForProduct(
        context.businessId,
        productId,
        product.productTypeCode
      ),
    ]);

    return {
      productId,
      variantLabel: resolveVariantLabel(profile.industryCode),
      variants: variantRows.map((row) =>
        this.mapVariantView(row, product.productCode, product.productName)
      ),
      attributeFields,
    };
  }

  async createVariant(
    context: CurrentBusinessContext,
    payload: CreateVariantPayload
  ): Promise<VariantWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = createVariantSchema.parse(payload);
    const product = await this.requireProduct(context, parsed.productId);
    this.assertParentAvailable(msg, product.statusCode);

    const code = normalizeVariantCode(parsed.variantCode);
    const existingCode = await this.variantRepository.findByCode(context.businessId, code);
    if (existingCode) {
      throw new ProductError(
        "DUPLICATE_VARIANT_CODE",
        msg.DUPLICATE_VARIANT_CODE,
        409,
        "variantCode"
      );
    }

    const definitionContexts = await this.loadDefinitionContexts(
      msg,
      context.businessId,
      parsed.productId,
      product.productTypeCode,
      parsed.attributes.map((item) => item.attributeDefinitionId)
    );

    const attributePairs: VariantAttributePair[] = parsed.attributes.map((item) => ({
      attributeDefinitionId: item.attributeDefinitionId,
      value: item.value,
    }));

    validateVariantAttributes(msg, definitionContexts, attributePairs);
    const fingerprint = computeVariantFingerprint(attributePairs);

    if (fingerprint) {
      const duplicate = await this.variantRepository.findByFingerprint(
        context.businessId,
        parsed.productId,
        fingerprint
      );
      if (duplicate) {
        throw new ProductError(
          "DUPLICATE_VARIANT_COMBINATION",
          msg.DUPLICATE_VARIANT_COMBINATION,
          409,
          "attributes"
        );
      }
    }

    const variant = await this.variantRepository.insert({
      businessId: context.businessId,
      productId: parsed.productId,
      variantCode: code,
      variantName: parsed.variantName.trim(),
      status: parsed.status ?? resolveDefaultVariantStatus(),
      displayOrder: parsed.displayOrder ?? 0,
      recordSource: parsed.recordSource ?? "PLATFORM_CREATED",
      combinationFingerprint: fingerprint,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.persistVariantAttributes(
      context,
      variant.id,
      attributePairs
    );

    await this.recordVariantLifecycleEvents(context, product, variant.id, variant.variantName, {
      variantEvent: VARIANT_TIMELINE_EVENT_TYPES.VARIANT_CREATED,
      productEvent: PRODUCT_TIMELINE_EVENT_TYPES.VARIANT_CREATED,
      summary: `Variant "${variant.variantName}" created`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: parsed.productId,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
      entityId: variant.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        variantCode: variant.variantCode,
        variantName: variant.variantName,
        status: variant.status,
      },
    });

    return this.getWorkspace(context, variant.id);
  }

  async updateVariant(
    context: CurrentBusinessContext,
    variantId: string,
    payload: UpdateVariantPayload
  ): Promise<VariantWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = updateVariantSchema.parse(payload);
    const existing = await this.requireVariant(context, variantId);
    const product = await this.requireProduct(context, existing.productId);
    this.assertParentAvailable(msg, product.statusCode);

    if (!isVariantEditable(existing.status)) {
      throw new ProductError(
        "ARCHIVED_VARIANT_IMMUTABLE",
        msg.ARCHIVED_VARIANT_IMMUTABLE,
        400
      );
    }

    if (
      parsed.status &&
      !canTransitionVariantStatus(existing.status, parsed.status)
    ) {
      throw new ProductError(
        "INVALID_VARIANT_STATUS_TRANSITION",
        msg.INVALID_VARIANT_STATUS_TRANSITION,
        400,
        "status"
      );
    }

    let fingerprint = existing.combinationFingerprint;

    if (parsed.attributes) {
      const definitionContexts = await this.loadDefinitionContexts(
        msg,
        context.businessId,
        existing.productId,
        product.productTypeCode,
        parsed.attributes.map((item) => item.attributeDefinitionId)
      );

      const attributePairs: VariantAttributePair[] = parsed.attributes.map((item) => ({
        attributeDefinitionId: item.attributeDefinitionId,
        value: item.value,
      }));

      validateVariantAttributes(msg, definitionContexts, attributePairs);
      fingerprint = computeVariantFingerprint(attributePairs);

      if (fingerprint) {
        const duplicate = await this.variantRepository.findByFingerprint(
          context.businessId,
          existing.productId,
          fingerprint,
          variantId
        );
        if (duplicate) {
          throw new ProductError(
            "DUPLICATE_VARIANT_COMBINATION",
            msg.DUPLICATE_VARIANT_COMBINATION,
            409,
            "attributes"
          );
        }
      }

      await this.variantAttributeRepository.softDeleteByVariantId(
        context.businessId,
        variantId,
        context.platformUserId
      );
      await this.persistVariantAttributes(context, variantId, attributePairs);
    }

    const updated = await this.variantRepository.update(
      context.businessId,
      variantId,
      {
        variantName: parsed.variantName?.trim(),
        displayOrder: parsed.displayOrder,
        status: parsed.status,
        combinationFingerprint: fingerprint,
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

    const eventType = parsed.attributes
      ? VARIANT_TIMELINE_EVENT_TYPES.ATTRIBUTE_OVERRIDE_UPDATED
      : VARIANT_TIMELINE_EVENT_TYPES.VARIANT_UPDATED;

    await this.variantTimelineService.recordEvent(
      buildVariantTimelineEventFromContext(context, {
        variantId,
        eventType,
        eventCategory: VARIANT_TIMELINE_EVENT_CATEGORIES.CONFIGURATION,
        sourceModule: VARIANT_TIMELINE_SOURCE_MODULES.PRODUCT_VARIANTS,
        summary: `Variant "${updated.variantName}" updated`,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: existing.productId,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
      entityId: variantId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: existing,
      after: updated,
      trackFields: ["variantName", "status", "displayOrder", "combinationFingerprint"],
    });

    return this.getWorkspace(context, variantId);
  }

  async cloneVariant(
    context: CurrentBusinessContext,
    variantId: string,
    payload: CloneVariantPayload = {}
  ): Promise<VariantWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = cloneVariantSchema.parse(payload);
    const source = await this.requireVariant(context, variantId);
    const product = await this.requireProduct(context, source.productId);
    this.assertParentAvailable(msg, product.statusCode);

    const sourceAttributes = await this.variantAttributeRepository.listByVariantId(
      context.businessId,
      variantId
    );

    let code = normalizeVariantCode(
      parsed.variantCode ?? buildCloneVariantCode(source.variantCode)
    );
    let suffix = 1;
    while (await this.variantRepository.findByCode(context.businessId, code)) {
      code = normalizeVariantCode(`${buildCloneVariantCode(source.variantCode)}${suffix}`);
      suffix += 1;
    }

    const attributePairs: VariantAttributePair[] = sourceAttributes.map((row) => ({
      attributeDefinitionId: row.row.attributeDefinitionId,
      value: row.row.attributeValue,
    }));

    const fingerprint = computeVariantFingerprint(attributePairs);
    if (fingerprint) {
      const duplicate = await this.variantRepository.findByFingerprint(
        context.businessId,
        source.productId,
        fingerprint
      );
      if (duplicate) {
        throw new ProductError(
          "DUPLICATE_VARIANT_COMBINATION",
          msg.DUPLICATE_VARIANT_COMBINATION,
          409,
          "attributes"
        );
      }
    }

    const clone = await this.variantRepository.insert({
      businessId: context.businessId,
      productId: source.productId,
      variantCode: code,
      variantName: parsed.variantName?.trim() ?? buildCloneVariantName(source.variantName),
      status: VARIANT_STATUS_CODES.DRAFT,
      displayOrder: source.displayOrder + 1,
      recordSource: source.recordSource,
      combinationFingerprint: fingerprint,
      metadata: { clonedFromVariantId: source.id },
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.persistVariantAttributes(context, clone.id, attributePairs);

    await this.variantTimelineService.recordEvent(
      buildVariantTimelineEventFromContext(context, {
        variantId: clone.id,
        eventType: VARIANT_TIMELINE_EVENT_TYPES.VARIANT_CLONED,
        eventCategory: VARIANT_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        sourceModule: VARIANT_TIMELINE_SOURCE_MODULES.PRODUCT_VARIANTS,
        summary: `Variant cloned from "${source.variantName}"`,
        referenceEntity: AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
        referenceId: source.id,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: source.productId,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
      entityId: clone.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      metadata: { clonedFromVariantId: source.id },
      createValues: {
        variantCode: clone.variantCode,
        variantName: clone.variantName,
      },
    });

    return this.getWorkspace(context, clone.id);
  }

  async activateVariant(
    context: CurrentBusinessContext,
    variantId: string
  ): Promise<VariantWorkspaceView> {
    return this.transitionVariantStatus(
      context,
      variantId,
      VARIANT_STATUS_CODES.ACTIVE,
      VARIANT_TIMELINE_EVENT_TYPES.VARIANT_ACTIVATED,
      PRODUCT_TIMELINE_EVENT_TYPES.VARIANT_ACTIVATED,
      AUDIT_OPERATIONS.ACTIVATE
    );
  }

  async suspendVariant(
    context: CurrentBusinessContext,
    variantId: string
  ): Promise<VariantWorkspaceView> {
    return this.transitionVariantStatus(
      context,
      variantId,
      VARIANT_STATUS_CODES.SUSPENDED,
      VARIANT_TIMELINE_EVENT_TYPES.VARIANT_SUSPENDED,
      PRODUCT_TIMELINE_EVENT_TYPES.VARIANT_SUSPENDED,
      AUDIT_OPERATIONS.DEACTIVATE
    );
  }

  async archiveVariant(
    context: CurrentBusinessContext,
    variantId: string
  ): Promise<VariantWorkspaceView> {
    return this.transitionVariantStatus(
      context,
      variantId,
      VARIANT_STATUS_CODES.ARCHIVED,
      VARIANT_TIMELINE_EVENT_TYPES.VARIANT_ARCHIVED,
      PRODUCT_TIMELINE_EVENT_TYPES.VARIANT_ARCHIVED,
      AUDIT_OPERATIONS.ARCHIVE
    );
  }

  async cascadeArchiveForProduct(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<number> {
    const archived = await this.variantRepository.archiveAllForProduct(
      context.businessId,
      productId,
      context.platformUserId
    );

    for (const variant of archived) {
      await this.variantTimelineService.recordEvent(
        buildVariantTimelineEventFromContext(context, {
          variantId: variant.id,
          eventType: VARIANT_TIMELINE_EVENT_TYPES.VARIANT_ARCHIVED,
          eventCategory: VARIANT_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
          sourceModule: VARIANT_TIMELINE_SOURCE_MODULES.PRODUCT_VARIANTS,
          summary: `Variant archived because parent product was archived`,
        })
      );
    }

    return archived.length;
  }

  async getWorkspace(
    context: CurrentBusinessContext,
    variantId: string
  ): Promise<VariantWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const variantRow = await this.variantRepository.findById(
      context.businessId,
      variantId
    );
    if (!variantRow) {
      throw new ProductError(
        "VARIANT_NOT_FOUND",
        msg.VARIANT_NOT_FOUND,
        404
      );
    }

    const product = await this.requireProduct(context, variantRow.productId);

    const [attributeRows, attributeFields, timeline, audit] = await Promise.all([
      this.variantAttributeRepository.listByVariantId(context.businessId, variantId),
      this.buildAttributeFieldsForProduct(
        context.businessId,
        variantRow.productId,
        product.productTypeCode
      ),
      this.variantTimelineService.getTimelinePanel(context.businessId, variantId),
      this.auditQueryService.getAuditPanel(context, variantId),
    ]);

    return {
      variant: this.mapVariantView(
        variantRow,
        product.productCode,
        product.productName
      ),
      attributes: attributeRows.map((row) => ({
        id: row.row.id,
        attributeDefinitionId: row.row.attributeDefinitionId,
        attributeCode: row.definitionCode,
        attributeName: row.definitionName,
        dataType: row.dataType,
        value: row.row.attributeValue,
        version: row.row.version,
      })),
      attributeFields,
      timeline,
      audit,
    };
  }

  async searchVariants(
    context: CurrentBusinessContext,
    payload: SearchVariantsPayload
  ): Promise<ProductVariantView[]> {
    const parsed = searchVariantsSchema.parse(payload);
    const rows = await this.variantRepository.listByBusinessId(context.businessId, {
      query: parsed.query,
      productId: parsed.productId,
      status: parsed.status,
    });

    return rows.map((row) =>
      this.mapVariantView(row.variant, row.productCode, row.productName)
    );
  }

  private async transitionVariantStatus(
    context: CurrentBusinessContext,
    variantId: string,
    nextStatus: string,
    variantEventType: string,
    productEventType: string,
    auditOperation: string
  ): Promise<VariantWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const existing = await this.requireVariant(context, variantId);
    const product = await this.requireProduct(context, existing.productId);

    if (!canTransitionVariantStatus(existing.status, nextStatus)) {
      throw new ProductError(
        "INVALID_VARIANT_STATUS_TRANSITION",
        msg.INVALID_VARIANT_STATUS_TRANSITION,
        400
      );
    }

    const updated = await this.variantRepository.update(
      context.businessId,
      variantId,
      { status: nextStatus, updatedBy: context.platformUserId },
      existing.version
    );

    if (!updated) {
      throw new ProductError(
        "PROVIDER_ERROR",
        "Concurrent update detected. Refresh and try again.",
        409
      );
    }

    await this.recordVariantLifecycleEvents(
      context,
      product,
      variantId,
      updated.variantName,
      {
        variantEvent: variantEventType,
        productEvent: productEventType,
        summary: `Variant "${updated.variantName}" ${variantStatusLabel(nextStatus).toLowerCase()}`,
      }
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: existing.productId,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
      entityId: variantId,
      operation: auditOperation,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: { status: existing.status },
      after: { status: updated.status },
      trackFields: ["status"],
    });

    return this.getWorkspace(context, variantId);
  }

  private async recordVariantLifecycleEvents(
    context: CurrentBusinessContext,
    product: { id: string; ownerPartyId: string | null },
    variantId: string,
    variantName: string,
    input: { variantEvent: string; productEvent: string; summary: string }
  ) {
    await this.variantTimelineService.recordEvent(
      buildVariantTimelineEventFromContext(context, {
        variantId,
        eventType: input.variantEvent,
        eventCategory: VARIANT_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        sourceModule: VARIANT_TIMELINE_SOURCE_MODULES.PRODUCT_VARIANTS,
        summary: input.summary,
      })
    );

    await this.productTimelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId: product.id,
        eventType: input.productEvent,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        sourceModule: PRODUCT_TIMELINE_SOURCE_MODULES.PRODUCT_MANAGEMENT,
        summary: input.summary,
        referenceEntity: AUDIT_ENTITY_NAMES.PRODUCT_VARIANT,
        referenceId: variantId,
      })
    );
  }

  private async persistVariantAttributes(
    context: CurrentBusinessContext,
    variantId: string,
    attributes: VariantAttributePair[]
  ) {
    for (const attribute of attributes) {
      await this.variantAttributeRepository.insert({
        businessId: context.businessId,
        variantId,
        attributeDefinitionId: attribute.attributeDefinitionId,
        attributeValue: attribute.value,
        createdBy: context.platformUserId,
        updatedBy: context.platformUserId,
      });
    }
  }

  private async loadDefinitionContexts(
    msg: ProductUserMessages,
    businessId: string,
    productId: string,
    productTypeCode: string,
    definitionIds: string[]
  ): Promise<VariantAttributeDefinitionContext[]> {
    const applicable = await this.resolveApplicableDefinitionIds(
      businessId,
      productId,
      productTypeCode
    );
    const applicableSet = new Set(applicable);

    const contexts: VariantAttributeDefinitionContext[] = [];

    for (const definitionId of definitionIds) {
      if (!applicableSet.has(definitionId)) {
        throw new ProductError(
          "ATTRIBUTE_DEFINITION_NOT_FOUND",
          msg.ATTRIBUTE_DEFINITION_NOT_FOUND,
          400,
          definitionId
        );
      }

      const definition = await this.definitionRepository.findById(
        businessId,
        definitionId
      );
      if (!definition) {
        continue;
      }

      const options = await this.optionRepository.listByDefinitionId(definitionId);
      contexts.push({
        id: definition.id,
        code: definition.code,
        name: definition.name,
        dataType: definition.dataType,
        isMandatory: definition.isMandatory,
        isReadOnly: false,
        validationRule: definition.validationRule,
        defaultValue: definition.defaultValue,
        options: options.map((option) => ({
          optionCode: option.optionCode,
          optionLabel: option.optionLabel,
          status: option.status,
        })),
      });
    }

    return contexts;
  }

  private async buildAttributeFieldsForProduct(
    businessId: string,
    productId: string,
    productTypeCode: string
  ): Promise<ProductAttributeFieldView[]> {
    const definitionIds = await this.resolveApplicableDefinitionIds(
      businessId,
      productId,
      productTypeCode
    );

    const fields: ProductAttributeFieldView[] = [];

    for (const definitionId of definitionIds) {
      const definition = await this.definitionRepository.findById(
        businessId,
        definitionId
      );
      if (!definition || definition.isHidden) {
        continue;
      }

      const groupRows = await this.definitionRepository.listByBusinessId(businessId, {
        groupId: definition.attributeGroupId,
      });
      const groupRow = groupRows.find((row) => row.definition.id === definition.id);
      const options = await this.optionRepository.listByDefinitionId(definitionId);

      fields.push({
        definition: {
          id: definition.id,
          attributeGroupId: definition.attributeGroupId,
          groupCode: groupRow?.groupCode ?? "",
          groupName: groupRow?.groupName ?? "",
          code: definition.code,
          name: definition.name,
          description: definition.description,
          dataType: definition.dataType,
          dataTypeLabel: attributeDataTypeLabel(definition.dataType),
          validationRule: (definition.validationRule as Record<string, unknown>) ?? null,
          defaultValue: definition.defaultValue,
          displayOrder: definition.displayOrder,
          isMandatory: definition.isMandatory,
          isReadOnly: false,
          isHidden: definition.isHidden,
          status: definition.status,
          statusLabel: definition.status,
          createdAt: definition.createdAt.toISOString(),
          updatedAt: definition.updatedAt.toISOString(),
          version: definition.version,
        },
        options: options.map((option) => ({
          id: option.id,
          optionCode: option.optionCode,
          optionLabel: option.optionLabel,
          displayOrder: option.displayOrder,
          status: option.status,
          version: option.version,
        })),
        value: definition.defaultValue,
        assignmentId: null,
        version: null,
      });
    }

    return fields.sort(
      (a, b) =>
        a.definition.displayOrder - b.definition.displayOrder ||
        a.definition.name.localeCompare(b.definition.name)
    );
  }

  private async resolveApplicableDefinitionIds(
    businessId: string,
    productId: string,
    productTypeCode: string
  ): Promise<string[]> {
    const [typeScopes, classificationAssignments, definitions] = await Promise.all([
      this.scopeRepository.listByProductType(businessId, productTypeCode),
      this.classificationAssignmentRepository.listActiveByProductId(
        businessId,
        productId
      ),
      this.definitionRepository.listByBusinessId(businessId, {
        status: ATTRIBUTE_DEFINITION_STATUS_CODES.ACTIVE,
      }),
    ]);

    const scopedIds = new Set<string>();
    for (const scope of typeScopes) {
      scopedIds.add(scope.attributeDefinitionId);
    }
    for (const row of classificationAssignments) {
      const classScopes = await this.scopeRepository.listByClassificationId(
        businessId,
        row.assignment.classificationId
      );
      for (const scope of classScopes) {
        scopedIds.add(scope.attributeDefinitionId);
      }
    }

    return definitions
      .filter((row) => scopedIds.has(row.definition.id))
      .map((row) => row.definition.id);
  }

  private async requireProduct(context: CurrentBusinessContext, productId: string) {
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
    return product;
  }

  private async requireVariant(context: CurrentBusinessContext, variantId: string) {
    const msg = await resolveProductUserMessagesForContext(context);
    const variant = await this.variantRepository.findById(
      context.businessId,
      variantId
    );
    if (!variant) {
      throw new ProductError(
        "VARIANT_NOT_FOUND",
        msg.VARIANT_NOT_FOUND,
        404
      );
    }
    return variant;
  }

  private assertParentAvailable(
    msg: ProductUserMessages,
    productStatusCode: string
  ) {
    if (!isParentProductAvailableForVariants(productStatusCode)) {
      throw new ProductError(
        "PARENT_PRODUCT_ARCHIVED",
        msg.PARENT_PRODUCT_ARCHIVED,
        400
      );
    }
  }

  private mapVariantView(
    variant: {
      id: string;
      productId: string;
      variantCode: string;
      variantName: string;
      status: string;
      displayOrder: number;
      recordSource: string;
      combinationFingerprint: string | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    },
    productCode: string,
    productName: string
  ): ProductVariantView {
    return {
      id: variant.id,
      productId: variant.productId,
      productCode,
      productName,
      variantCode: variant.variantCode,
      variantName: variant.variantName,
      status: variant.status,
      statusLabel: variantStatusLabel(variant.status),
      displayOrder: variant.displayOrder,
      recordSource: variant.recordSource,
      combinationFingerprint: variant.combinationFingerprint,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString(),
      version: variant.version,
    };
  }
}

export function createProductVariantService() {
  return new ProductVariantService();
}
