/**
 * Purpose:
 * Offering Relationship Management — add, edit, deactivate, reactivate, remove.
 *
 * Architecture:
 * Server Actions → OfferingRelationshipService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-010 – Offering Relationships
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
} from "@/core/product-timeline";
import {
  OFFERING_RELATIONSHIP_STATUS_CODES,
  PRODUCT_STATUS_CODES,
  type OfferingRelationshipStatusCode,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createOfferingRelationshipRepository } from "@/modules/product/repositories/offering-relationship-repository";
import { createOfferingRelationshipTypeRepository } from "@/modules/product/repositories/offering-relationship-type-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  canDeactivateRelationship,
  canReactivateRelationship,
  groupRelationshipsBySection,
  isOfferingRelationshipStatusCode,
  isSelfRelationship,
  OFFERING_RELATIONSHIP_TYPE_CODES,
  todayIsoDate,
  wouldCreateCircularDependency,
} from "@/modules/product/services/offering-relationship-rules";
import type {
  AddOfferingRelationshipPayload,
  OfferingRelationshipsPanelView,
  OfferingRelationshipView,
  ProductSummaryView,
  UpdateOfferingRelationshipPayload,
} from "@/modules/product/types";
import { nullableTrimmed } from "@/modules/product/validators/offering-document-validators";
import {
  addOfferingRelationshipSchema,
  offeringSearchQuerySchema,
  updateOfferingRelationshipSchema,
} from "@/modules/product/validators/offering-relationship-validators";

export class OfferingRelationshipService {
  constructor(
    private readonly productRepository = createProductRepository(),
    private readonly offeringRelationshipRepository = createOfferingRelationshipRepository(),
    private readonly offeringRelationshipTypeRepository = createOfferingRelationshipTypeRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly auditService = createAuditService()
  ) {}

  async getOfferingRelationshipsPanel(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<OfferingRelationshipsPanelView> {
    await this.requireProduct(context, productId);

    const [rows, relationshipTypes] = await Promise.all([
      this.offeringRelationshipRepository.listByOfferingId(
        context.businessId,
        productId
      ),
      this.offeringRelationshipTypeRepository.listActiveByBusinessId(
        context.businessId
      ),
    ]);

    if (relationshipTypes.length === 0) {
      throw new ProductError(
        "REFERENCE_DATA_MISSING",
        "Relationship Type catalogue is empty. Seed offering relationship types before continuing.",
        503
      );
    }

    const typeNameById = new Map(
      relationshipTypes.map((type) => [type.id, type.name])
    );
    const typeCodeById = new Map(
      relationshipTypes.map((type) => [type.id, type.code])
    );

    const offeringIds = new Set<string>();
    for (const row of rows) {
      offeringIds.add(row.sourceOfferingId);
      offeringIds.add(row.targetOfferingId);
    }
    offeringIds.delete(productId);

    const relatedProducts = await Promise.all(
      [...offeringIds].map((id) =>
        this.productRepository.findById(context.businessId, id)
      )
    );
    const productById = new Map(
      relatedProducts
        .filter((row) => row !== null)
        .map((row) => [row!.id, row!])
    );

    const relationships = rows.map((row) =>
      this.toView(
        row,
        productId,
        typeNameById,
        typeCodeById,
        productById
      )
    );

    return {
      relationships,
      availableRelationshipTypes: relationshipTypes.map((type) => ({
        code: type.code,
        name: type.name,
        description: type.description,
      })),
      sections: groupRelationshipsBySection(relationships),
    };
  }

  async searchOfferingsForRelationship(
    context: CurrentBusinessContext,
    productId: string,
    query: string
  ): Promise<ProductSummaryView[]> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = offeringSearchQuerySchema.safeParse({
      query,
      excludeProductId: productId,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const rows = await this.productRepository.listByBusinessId(
      context.businessId,
      { search: parsed.data.query, limit: 20, offset: 0 }
    );

    const filtered = rows.filter((row) => row.id !== productId);

    return Promise.all(
      filtered.map(async (row) => ({
        id: row.id,
        productCode: row.productCode,
        productName: row.productName,
        shortName: row.shortName,
        productTypeCode: row.productTypeCode,
        productTypeName: row.productTypeCode,
        statusCode: row.statusCode,
        statusName: row.statusCode,
        ownerPartyId: row.ownerPartyId,
        ownerDisplayName: null,
        recordSource: row.recordSource,
        recordSourceLabel: row.recordSource,
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      }))
    );
  }

  async addRelationship(
    context: CurrentBusinessContext,
    sourceOfferingId: string,
    payload: AddOfferingRelationshipPayload
  ): Promise<OfferingRelationshipsPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = addOfferingRelationshipSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireMutableProduct(context, sourceOfferingId);

    if (isSelfRelationship(sourceOfferingId, parsed.data.targetOfferingId)) {
      throw new ProductError(
        "SELF_RELATIONSHIP_NOT_ALLOWED",
        msg.SELF_RELATIONSHIP_NOT_ALLOWED,
        400,
        "targetOfferingId"
      );
    }

    const targetProduct = await this.productRepository.findById(
      context.businessId,
      parsed.data.targetOfferingId
    );
    if (!targetProduct) {
      throw new ProductError(
        "PRODUCT_NOT_FOUND",
        "Select an existing related product.",
        404,
        "targetOfferingId"
      );
    }

    const relationshipType =
      await this.offeringRelationshipTypeRepository.findByCode(
        context.businessId,
        parsed.data.relationshipTypeCode
      );
    if (!relationshipType) {
      throw new ProductError(
        "INVALID_INPUT",
        "Select a valid relationship type.",
        400,
        "relationshipTypeCode"
      );
    }

    const duplicate =
      await this.offeringRelationshipRepository.findActiveByOfferingsAndType(
        context.businessId,
        sourceOfferingId,
        parsed.data.targetOfferingId,
        relationshipType.id
      );
    if (duplicate) {
      throw new ProductError(
        "DUPLICATE_OFFERING_RELATIONSHIP",
        msg.DUPLICATE_OFFERING_RELATIONSHIP,
        409,
        "relationshipTypeCode"
      );
    }

    if (
      relationshipType.code === OFFERING_RELATIONSHIP_TYPE_CODES.DEPENDS_ON &&
      targetProduct.statusCode !== PRODUCT_STATUS_CODES.ACTIVE
    ) {
      throw new ProductError(
        "INVALID_INPUT",
        "Inactive offerings cannot become mandatory dependencies.",
        400,
        "targetOfferingId"
      );
    }

    if (relationshipType.code === OFFERING_RELATIONSHIP_TYPE_CODES.DEPENDS_ON) {
      const dependsOnType =
        await this.offeringRelationshipTypeRepository.findByCode(
          context.businessId,
          OFFERING_RELATIONSHIP_TYPE_CODES.DEPENDS_ON
        );
      if (dependsOnType) {
        const activeEdges =
          await this.offeringRelationshipRepository.listActiveDependsOnEdges(
            context.businessId,
            dependsOnType.id
          );
        if (
          wouldCreateCircularDependency(
            sourceOfferingId,
            parsed.data.targetOfferingId,
            activeEdges
          )
        ) {
          throw new ProductError(
            "CIRCULAR_DEPENDENCY",
            msg.CIRCULAR_DEPENDENCY,
            409,
            "targetOfferingId"
          );
        }
      }
    }

    const effectiveFrom =
      parsed.data.effectiveFrom?.trim() || todayIsoDate();
    const effectiveTo = nullableTrimmed(parsed.data.effectiveTo ?? null);

    const inserted = await this.offeringRelationshipRepository.insert({
      businessId: context.businessId,
      sourceOfferingId,
      targetOfferingId: parsed.data.targetOfferingId,
      relationshipTypeId: relationshipType.id,
      effectiveFrom,
      effectiveTo,
      status: OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE,
      notes: nullableTrimmed(parsed.data.notes),
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.recordRelationshipTimeline(
      context,
      sourceOfferingId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_RELATIONSHIP_CREATED,
      `${relationshipType.name} relationship with ${targetProduct.productName}`,
      inserted.id,
      {
        sourceOfferingId,
        targetOfferingId: parsed.data.targetOfferingId,
        relationshipTypeCode: relationshipType.code,
        effectiveFrom,
        effectiveTo,
      }
    );

    return this.getOfferingRelationshipsPanel(context, sourceOfferingId);
  }

  async updateRelationship(
    context: CurrentBusinessContext,
    productId: string,
    offeringRelationshipId: string,
    payload: UpdateOfferingRelationshipPayload
  ): Promise<OfferingRelationshipsPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = updateOfferingRelationshipSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    await this.requireMutableProduct(context, productId);
    await this.requireRelationshipForOffering(
      context,
      productId,
      offeringRelationshipId
    );

    await this.offeringRelationshipRepository.updateById(
      context.businessId,
      offeringRelationshipId,
      {
        ...(parsed.data.effectiveFrom !== undefined
          ? { effectiveFrom: parsed.data.effectiveFrom.trim() }
          : {}),
        ...(parsed.data.effectiveTo !== undefined
          ? { effectiveTo: nullableTrimmed(parsed.data.effectiveTo) }
          : {}),
        ...(parsed.data.notes !== undefined
          ? { notes: nullableTrimmed(parsed.data.notes) }
          : {}),
        updatedBy: context.platformUserId,
      }
    );

    await this.recordRelationshipTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_RELATIONSHIP_UPDATED,
      "Relationship updated",
      offeringRelationshipId
    );

    return this.getOfferingRelationshipsPanel(context, productId);
  }

  async deactivateRelationship(
    context: CurrentBusinessContext,
    productId: string,
    offeringRelationshipId: string
  ): Promise<OfferingRelationshipsPanelView> {
    await this.requireMutableProduct(context, productId);
    const relationship = await this.requireRelationshipForOffering(
      context,
      productId,
      offeringRelationshipId
    );

    if (
      !canDeactivateRelationship(
        relationship.status as OfferingRelationshipStatusCode
      )
    ) {
      throw new ProductError(
        "INVALID_INPUT",
        "This relationship cannot be deactivated in its current state.",
        400
      );
    }

    await this.offeringRelationshipRepository.updateById(
      context.businessId,
      offeringRelationshipId,
      {
        status: OFFERING_RELATIONSHIP_STATUS_CODES.INACTIVE,
        effectiveTo: relationship.effectiveTo ?? todayIsoDate(),
        updatedBy: context.platformUserId,
      }
    );

    await this.recordRelationshipTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_RELATIONSHIP_UPDATED,
      "Relationship deactivated",
      offeringRelationshipId
    );

    return this.getOfferingRelationshipsPanel(context, productId);
  }

  async reactivateRelationship(
    context: CurrentBusinessContext,
    productId: string,
    offeringRelationshipId: string
  ): Promise<OfferingRelationshipsPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.requireMutableProduct(context, productId);
    const relationship = await this.requireRelationshipForOffering(
      context,
      productId,
      offeringRelationshipId
    );

    if (
      !canReactivateRelationship(
        relationship.status as OfferingRelationshipStatusCode
      )
    ) {
      throw new ProductError(
        "INVALID_INPUT",
        "This relationship cannot be reactivated in its current state.",
        400
      );
    }

    const duplicate =
      await this.offeringRelationshipRepository.findActiveByOfferingsAndType(
        context.businessId,
        relationship.sourceOfferingId,
        relationship.targetOfferingId,
        relationship.relationshipTypeId
      );
    if (duplicate && duplicate.id !== offeringRelationshipId) {
      throw new ProductError(
        "DUPLICATE_OFFERING_RELATIONSHIP",
        msg.DUPLICATE_OFFERING_RELATIONSHIP,
        409
      );
    }

    await this.offeringRelationshipRepository.updateById(
      context.businessId,
      offeringRelationshipId,
      {
        status: OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE,
        effectiveTo: null,
        updatedBy: context.platformUserId,
      }
    );

    await this.recordRelationshipTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_RELATIONSHIP_UPDATED,
      "Relationship reactivated",
      offeringRelationshipId
    );

    return this.getOfferingRelationshipsPanel(context, productId);
  }

  async removeRelationship(
    context: CurrentBusinessContext,
    productId: string,
    offeringRelationshipId: string
  ): Promise<OfferingRelationshipsPanelView> {
    await this.requireMutableProduct(context, productId);
    await this.requireRelationshipForOffering(
      context,
      productId,
      offeringRelationshipId
    );

    await this.offeringRelationshipRepository.updateById(
      context.businessId,
      offeringRelationshipId,
      {
        deletedAt: new Date(),
        updatedBy: context.platformUserId,
      }
    );

    await this.recordRelationshipTimeline(
      context,
      productId,
      PRODUCT_TIMELINE_EVENT_TYPES.OFFERING_RELATIONSHIP_REMOVED,
      "Relationship removed",
      offeringRelationshipId
    );

    return this.getOfferingRelationshipsPanel(context, productId);
  }

  private async recordRelationshipTimeline(
    context: CurrentBusinessContext,
    productId: string,
    eventType: string,
    summary: string,
    referenceId?: string,
    createValues?: Record<string, unknown>
  ) {
    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.RELATIONSHIPS,
        summary,
        referenceEntity: AUDIT_ENTITY_NAMES.OFFERING_RELATIONSHIP,
        referenceId,
      })
    );

    if (referenceId) {
      const product = await this.productRepository.findById(
        context.businessId,
        productId
      );

      await recordProductEntityAudit(this.auditService, context, {
        productId,
        ownerPartyId: product?.ownerPartyId ?? null,
        entityName: AUDIT_ENTITY_NAMES.OFFERING_RELATIONSHIP,
        entityId: referenceId,
        operation: this.inferAuditOperation(eventType),
        sourceModule: AUDIT_SOURCE_MODULES.OFFERING_RELATIONSHIPS,
        createValues,
      });
    }
  }

  private inferAuditOperation(eventType: string): string {
    const normalized = eventType.toUpperCase();
    if (normalized.includes("CREATED")) {
      return AUDIT_OPERATIONS.CREATE;
    }
    if (normalized.includes("REMOVED")) {
      return AUDIT_OPERATIONS.DELETE;
    }
    if (normalized.includes("DEACTIVATED")) {
      return AUDIT_OPERATIONS.DEACTIVATE;
    }
    return AUDIT_OPERATIONS.UPDATE;
  }

  private async requireProduct(
    context: CurrentBusinessContext,
    productId: string
  ) {
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

  private async requireMutableProduct(
    context: CurrentBusinessContext,
    productId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const product = await this.requireProduct(context, productId);
    if (product.statusCode === PRODUCT_STATUS_CODES.ARCHIVED) {
      throw new ProductError(
        "ARCHIVED_PRODUCT_IMMUTABLE",
        msg.ARCHIVED_PRODUCT_IMMUTABLE,
        400
      );
    }
    return product;
  }

  private async requireRelationshipForOffering(
    context: CurrentBusinessContext,
    productId: string,
    offeringRelationshipId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const relationship = await this.offeringRelationshipRepository.findById(
      context.businessId,
      offeringRelationshipId
    );
    if (
      !relationship ||
      (relationship.sourceOfferingId !== productId &&
        relationship.targetOfferingId !== productId)
    ) {
      throw new ProductError(
        "OFFERING_RELATIONSHIP_NOT_FOUND",
        msg.OFFERING_RELATIONSHIP_NOT_FOUND,
        404
      );
    }
    return relationship;
  }

  private toView(
    row: {
      id: string;
      sourceOfferingId: string;
      targetOfferingId: string;
      relationshipTypeId: string;
      effectiveFrom: string;
      effectiveTo: string | null;
      status: string;
      notes: string | null;
    },
    currentOfferingId: string,
    typeNameById: Map<string, string>,
    typeCodeById: Map<string, string>,
    productById: Map<
      string,
      { id: string; productCode: string; productName: string }
    >
  ): OfferingRelationshipView {
    const isOutgoing = row.sourceOfferingId === currentOfferingId;
    const relatedOfferingId = isOutgoing
      ? row.targetOfferingId
      : row.sourceOfferingId;
    const relatedProduct = productById.get(relatedOfferingId);
    const relationshipTypeCode =
      typeCodeById.get(row.relationshipTypeId) ?? "UNKNOWN";

    const statusCode = isOfferingRelationshipStatusCode(row.status)
      ? row.status
      : OFFERING_RELATIONSHIP_STATUS_CODES.ACTIVE;

    return {
      id: row.id,
      sourceOfferingId: row.sourceOfferingId,
      targetOfferingId: row.targetOfferingId,
      relatedOfferingId,
      relatedOfferingCode: relatedProduct?.productCode ?? "—",
      relatedOfferingName: relatedProduct?.productName ?? "Unknown product",
      relationshipTypeCode,
      relationshipTypeName:
        typeNameById.get(row.relationshipTypeId) ?? relationshipTypeCode,
      direction: isOutgoing ? "OUTGOING" : "INCOMING",
      effectiveFrom: row.effectiveFrom,
      effectiveTo: row.effectiveTo,
      statusCode,
      notes: row.notes,
    };
  }
}

export function createOfferingRelationshipService(): OfferingRelationshipService {
  return new OfferingRelationshipService();
}
