/**
 * Purpose:
 * Product Classification Engine — hierarchy CRUD, moves, and product assignments.
 *
 * Architecture:
 * Server Actions → ProductClassificationService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 *
 * Engine:
 * ENG-003f – Product Intelligence & Performance Engine
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
import { getDb } from "@/db/client";
import {
  PRODUCT_CLASSIFICATION_STATUS_CODES,
  PRODUCT_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import {
  createProductClassificationAssignmentRepository,
  type AssignmentWithDetails,
} from "@/modules/product/repositories/product-classification-assignment-repository";
import { createProductClassificationRepository } from "@/modules/product/repositories/product-classification-repository";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import {
  canArchiveClassification,
  canAssignToClassification,
  canTransitionClassificationStatus,
  classificationApprovalStatusLabel,
  classificationStatusLabel,
  computeHierarchyLevel,
  isValidDirectParent,
  normalizeClassificationCode,
  resolveDefaultClassificationStatus,
  shouldAssignAsPrimary,
  todayIsoDate,
  wouldCreateCircularHierarchy,
} from "@/modules/product/services/product-classification-rules";
import {
  buildClassificationTimelineEventFromContext,
  CLASSIFICATION_TIMELINE_EVENT_CATEGORIES,
  CLASSIFICATION_TIMELINE_EVENT_TYPES,
  createProductClassificationTimelineService,
} from "@/core/product-classification-timeline";
import { filterClassificationsForIndustry } from "@/core/industry-experience/classification-filters";
import { createProductReferenceRepository } from "@/modules/product/repositories/product-reference-repository";
import {
  buildClassificationBreadcrumbPath,
  buildProductClassificationTree,
  collectDescendantIds,
  computeMaxTreeDepth,
} from "@/modules/product/services/product-classification-tree";
import type {
  ProductClassificationBreadcrumbItem,
  AssignProductClassificationPayload,
  CreateProductClassificationPayload,
  MoveProductClassificationPayload,
  ProductClassificationAssignmentView,
  ProductClassificationDashboardView,
  ProductClassificationPanelView,
  ProductClassificationView,
  ProductClassificationWorkspaceView,
  SearchProductClassificationsPayload,
  SetPrimaryClassificationPayload,
  UpdateProductClassificationPayload,
} from "@/modules/product/types";
import {
  assignProductClassificationSchema,
  createProductClassificationSchema,
  moveProductClassificationSchema,
  searchProductClassificationsSchema,
  setPrimaryClassificationSchema,
  updateProductClassificationSchema,
} from "@/modules/product/validators/product-classification-validators";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import { DEFAULT_OFFERING_WORKSPACE_LABEL } from "@/core/industry-experience/offering-terminology";

export class ProductClassificationService {
  constructor(
    private readonly classificationRepository = createProductClassificationRepository(),
    private readonly assignmentRepository = createProductClassificationAssignmentRepository(),
    private readonly productRepository = createProductRepository(),
    private readonly timelineService = createProductTimelineService(),
    private readonly classificationTimelineService =
      createProductClassificationTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly referenceRepository = createProductReferenceRepository(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async getDashboard(
    context: CurrentBusinessContext
  ): Promise<ProductClassificationDashboardView> {
    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );
    const [rows, classificationTypes, industries] = await Promise.all([
      this.classificationRepository.listByBusinessId(context.businessId),
      this.referenceRepository.listActiveClassificationTypes(),
      this.referenceRepository.listActiveIndustries(),
    ]);
    const allViews = await this.mapViews(context.businessId, rows);
    const views = filterClassificationsForIndustry(
      allViews,
      profile.industryCode
    );
    const tree = buildProductClassificationTree(views);

    return {
      totalClassifications: views.length,
      activeClassifications: views.filter(
        (item) => item.status === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE
      ).length,
      draftClassifications: views.filter(
        (item) => item.status === PRODUCT_CLASSIFICATION_STATUS_CODES.DRAFT
      ).length,
      suspendedClassifications: views.filter(
        (item) => item.status === PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED
      ).length,
      archivedClassifications: views.filter(
        (item) => item.status === PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED
      ).length,
      deprecatedClassifications: views.filter(
        (item) => item.status === PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED
      ).length,
      rootClassifications: views.filter(
        (item) => !item.parentClassificationId
      ).length,
      maxDepth: computeMaxTreeDepth(tree),
      tree,
      recentlyUpdated: views
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5),
      catalogueLabel: profile.offeringWorkspaceLabel ?? DEFAULT_OFFERING_WORKSPACE_LABEL,
      industryCode: profile.industryCode,
      industryName: profile.industryName,
      classificationTypes,
      industries,
    };
  }

  async searchClassifications(
    context: CurrentBusinessContext,
    search: SearchProductClassificationsPayload
  ): Promise<ProductClassificationView[]> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = searchProductClassificationsSchema.safeParse(search);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const rows = await this.classificationRepository.search(context.businessId, {
      query: parsed.data.query,
      status: parsed.data.status,
      parentClassificationId: parsed.data.parentClassificationId,
    });

    return this.mapViews(context.businessId, rows);
  }

  async getTree(context: CurrentBusinessContext) {
    const rows = await this.classificationRepository.listByBusinessId(
      context.businessId
    );
    const views = await this.mapViews(context.businessId, rows);
    return buildProductClassificationTree(views);
  }

  async getChildren(
    context: CurrentBusinessContext,
    parentClassificationId: string | null
  ): Promise<ProductClassificationView[]> {
    const rows = await this.classificationRepository.listChildren(
      context.businessId,
      parentClassificationId
    );
    return this.mapViews(context.businessId, rows);
  }

  async getClassificationWorkspace(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationWorkspaceView> {
    const [classificationTypes, ownerParties] = await Promise.all([
      this.referenceRepository.listActiveClassificationTypes(),
      this.referenceRepository.listOwnerPartyOptions(context.businessId),
    ]);
    const classification = await this.requireClassification(
      context,
      classificationId
    );
    const allRows = await this.classificationRepository.listByBusinessId(
      context.businessId
    );
    const allViews = await this.mapViews(context.businessId, allRows);
    const viewById = new Map(allViews.map((item) => [item.id, item]));
    const tree = buildProductClassificationTree(allViews);
    const children = allViews.filter(
      (item) => item.parentClassificationId === classificationId
    );
    const [assignedProducts, productCounts, timeline] = await Promise.all([
      this.assignmentRepository.listActiveByClassificationId(
        context.businessId,
        classificationId
      ),
      this.assignmentRepository.countAssignedProductsByStatus(
        context.businessId,
        classificationId
      ),
      this.classificationTimelineService.getTimelinePanel(
        context.businessId,
        classificationId
      ),
    ]);
    const parentById = new Map(
      allRows.map((row) => [row.id, row.parentClassificationId])
    );
    const descendants = collectDescendantIds(classificationId, parentById);
    const breadcrumbPath: ProductClassificationBreadcrumbItem[] =
      buildClassificationBreadcrumbPath(classificationId, viewById).map(
        (item) => ({
          id: item.id,
          name: item.name,
          code: item.code,
          icon: item.icon,
        })
      );

    return {
      classification,
      children,
      tree,
      breadcrumbPath,
      assignedProducts: assignedProducts.map((row) =>
        this.toAssignmentView(row)
      ),
      parentOptions: allViews
        .filter(
          (item) =>
            item.id !== classificationId && !descendants.has(item.id)
        )
        .map((item) => ({
          id: item.id,
          label: `${item.code} — ${item.name}`,
        })),
      classificationTypes,
      ownerParties: ownerParties.map((party) => ({
        id: party.id,
        displayName: party.displayName,
      })),
      summary: {
        childCount: children.length,
        assignedProductCount: productCounts.total,
        activeProductCount: productCounts.active,
        archivedProductCount: productCounts.archived,
        descendantCount: descendants.size,
        hierarchyDepth: classification.hierarchyLevel + 1,
        lastModified: classification.updatedAt,
        parentLabel: classification.parentName,
      },
      timeline,
    };
  }

  async getProductClassifications(
    context: CurrentBusinessContext,
    productId: string
  ): Promise<ProductClassificationPanelView> {
    await this.requireProduct(context, productId);

    const [assignments, allRows] = await Promise.all([
      this.assignmentRepository.listActiveByProductId(
        context.businessId,
        productId
      ),
      this.classificationRepository.listByBusinessId(context.businessId),
    ]);

    const assignedIds = new Set(
      assignments.map((row) => row.assignment.classificationId)
    );
    const views = assignments.map((row) => this.toAssignmentView(row));
    const primary =
      views.find((item) => item.isPrimary) ?? views[0] ?? null;

    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );
    const allViews = await this.mapViews(context.businessId, allRows);
    const industryFiltered = filterClassificationsForIndustry(
      allViews,
      profile.industryCode
    );

    return {
      assignments: views,
      primaryClassification: primary,
      additionalClassifications: views.filter((item) => !item.isPrimary),
      availableClassifications: industryFiltered
        .filter(
          (row) =>
            row.status === PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE &&
            !assignedIds.has(row.id)
        )
        .map((row) => ({ id: row.id, code: row.code, name: row.name })),
    };
  }

  async createClassification(
    context: CurrentBusinessContext,
    payload: CreateProductClassificationPayload
  ): Promise<ProductClassificationDashboardView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = createProductClassificationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const code = normalizeClassificationCode(parsed.data.code);
    const existing = await this.classificationRepository.findByCode(
      context.businessId,
      code
    );
    if (existing) {
      throw new ProductError(
        "DUPLICATE_CLASSIFICATION_CODE",
        msg.DUPLICATE_CLASSIFICATION_CODE,
        409,
        "code"
      );
    }

    let parentLevel: number | null = null;
    if (parsed.data.parentClassificationId) {
      const parent = await this.requireClassification(
        context,
        parsed.data.parentClassificationId
      );
      if (!canAssignToClassification(parent.status)) {
        throw new ProductError(
          "INACTIVE_CLASSIFICATION",
          msg.INACTIVE_CLASSIFICATION,
          400,
          "parentClassificationId"
        );
      }
      parentLevel = parent.hierarchyLevel;
    }

    const typeCode = parsed.data.classificationTypeCode ?? "CATEGORY";
    const type = await this.referenceRepository.findClassificationTypeByCode(
      typeCode
    );
    if (!type) {
      throw new ProductError(
        "INVALID_INPUT",
        "Select a valid structure type.",
        400,
        "classificationTypeCode"
      );
    }

    const created = await this.classificationRepository.insert({
      businessId: context.businessId,
      parentClassificationId: parsed.data.parentClassificationId ?? null,
      code,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      classificationTypeCode: typeCode,
      industryCode: parsed.data.industryCode ?? null,
      icon: parsed.data.icon ?? null,
      displayOrder: parsed.data.displayOrder ?? 0,
      hierarchyLevel: computeHierarchyLevel(parentLevel),
      status: resolveDefaultClassificationStatus(),
      ownerPartyId: parsed.data.ownerPartyId ?? null,
      businessUnit: parsed.data.businessUnit ?? null,
      effectiveDate: parsed.data.effectiveDate ?? todayIsoDate(),
      effectiveTo: parsed.data.effectiveTo ?? null,
      approvalStatus: parsed.data.approvalStatus ?? "NOT_REQUIRED",
      reasonForChange: parsed.data.reasonForChange ?? null,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    await this.recordClassificationTimeline(context, {
      classificationId: created.id,
      eventType: CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_CREATED,
      eventCategory: CLASSIFICATION_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
      summary: `Catalogue node created — ${created.name}`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: created.id,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_CLASSIFICATION,
      entityId: created.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        code: created.code,
        name: created.name,
        parentClassificationId: created.parentClassificationId,
        hierarchyLevel: created.hierarchyLevel,
      },
    });

    return this.getDashboard(context);
  }

  async updateClassification(
    context: CurrentBusinessContext,
    classificationId: string,
    payload: UpdateProductClassificationPayload
  ): Promise<ProductClassificationWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = updateProductClassificationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const before = await this.requireClassification(context, classificationId);
    const updated = await this.classificationRepository.updateById(
      context.businessId,
      classificationId,
      {
        name: parsed.data.name?.trim(),
        description: parsed.data.description,
        classificationTypeCode: parsed.data.classificationTypeCode,
        industryCode: parsed.data.industryCode,
        icon: parsed.data.icon,
        displayOrder: parsed.data.displayOrder,
        effectiveDate: parsed.data.effectiveDate,
        effectiveTo: parsed.data.effectiveTo,
        ownerPartyId: parsed.data.ownerPartyId,
        businessUnit: parsed.data.businessUnit,
        approvalStatus: parsed.data.approvalStatus,
        reasonForChange: parsed.data.reasonForChange,
        updatedBy: context.platformUserId,
      }
    );

    if (!updated) {
      throw new ProductError(
        "CLASSIFICATION_NOT_FOUND",
        msg.CLASSIFICATION_NOT_FOUND,
        404
      );
    }

    await this.recordClassificationTimeline(context, {
      classificationId,
      eventType: CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_UPDATED,
      eventCategory: CLASSIFICATION_TIMELINE_EVENT_CATEGORIES.GOVERNANCE,
      summary: `Catalogue node updated — ${updated.name}`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: classificationId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_CLASSIFICATION,
      entityId: classificationId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: {
        name: before.name,
        description: before.description,
        displayOrder: before.displayOrder,
      },
      after: {
        name: updated.name,
        description: updated.description,
        displayOrder: updated.displayOrder,
      },
      trackFields: ["name", "description", "displayOrder"],
    });

    return this.getClassificationWorkspace(context, classificationId);
  }

  async moveClassification(
    context: CurrentBusinessContext,
    classificationId: string,
    payload: MoveProductClassificationPayload
  ): Promise<ProductClassificationWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = moveProductClassificationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    if (
      !isValidDirectParent(
        classificationId,
        parsed.data.parentClassificationId
      )
    ) {
      throw new ProductError(
        "CIRCULAR_CLASSIFICATION_HIERARCHY",
        msg.CIRCULAR_CLASSIFICATION_HIERARCHY,
        400,
        "parentClassificationId"
      );
    }

    const allRows = await this.classificationRepository.listByBusinessId(
      context.businessId
    );
    const parentById = new Map(
      allRows.map((row) => [row.id, row.parentClassificationId])
    );

    if (
      wouldCreateCircularHierarchy(
        classificationId,
        parsed.data.parentClassificationId,
        parentById
      )
    ) {
      throw new ProductError(
        "CIRCULAR_CLASSIFICATION_HIERARCHY",
        msg.CIRCULAR_CLASSIFICATION_HIERARCHY,
        400,
        "parentClassificationId"
      );
    }

    let newLevel = 0;
    if (parsed.data.parentClassificationId) {
      const parent = await this.requireClassification(
        context,
        parsed.data.parentClassificationId
      );
      if (!canAssignToClassification(parent.status)) {
        throw new ProductError(
          "INACTIVE_CLASSIFICATION",
          msg.INACTIVE_CLASSIFICATION,
          400,
          "parentClassificationId"
        );
      }
      newLevel = parent.hierarchyLevel + 1;
    }

    const before = await this.requireClassification(context, classificationId);
    await this.classificationRepository.updateById(
      context.businessId,
      classificationId,
      {
        parentClassificationId: parsed.data.parentClassificationId,
        displayOrder: parsed.data.displayOrder,
        hierarchyLevel: newLevel,
        updatedBy: context.platformUserId,
      }
    );

    await this.recomputeDescendantLevels(
      context.businessId,
      classificationId,
      newLevel,
      allRows
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: classificationId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_CLASSIFICATION,
      entityId: classificationId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: {
        parentClassificationId: before.parentClassificationId,
        hierarchyLevel: before.hierarchyLevel,
      },
      after: {
        parentClassificationId: parsed.data.parentClassificationId,
        hierarchyLevel: newLevel,
      },
      trackFields: ["parentClassificationId", "hierarchyLevel"],
      metadata: { move: true },
    });

    await this.recordClassificationTimeline(context, {
      classificationId,
      eventType: CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_MOVED,
      eventCategory: CLASSIFICATION_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
      summary: `Catalogue node moved — ${before.name}`,
    });

    return this.getClassificationWorkspace(context, classificationId);
  }

  async archiveClassification(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationWorkspaceView> {
    return this.transitionClassificationStatus(
      context,
      classificationId,
      PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED,
      CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_ARCHIVED,
      AUDIT_OPERATIONS.ARCHIVE
    );
  }

  /** @deprecated Use archiveClassification */
  async deactivateClassification(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationWorkspaceView> {
    return this.archiveClassification(context, classificationId);
  }

  async activateClassification(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationWorkspaceView> {
    return this.transitionClassificationStatus(
      context,
      classificationId,
      PRODUCT_CLASSIFICATION_STATUS_CODES.ACTIVE,
      CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_ACTIVATED,
      AUDIT_OPERATIONS.ACTIVATE
    );
  }

  async suspendClassification(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationWorkspaceView> {
    return this.transitionClassificationStatus(
      context,
      classificationId,
      PRODUCT_CLASSIFICATION_STATUS_CODES.SUSPENDED,
      CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_SUSPENDED,
      AUDIT_OPERATIONS.DEACTIVATE
    );
  }

  async deprecateClassification(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationWorkspaceView> {
    return this.transitionClassificationStatus(
      context,
      classificationId,
      PRODUCT_CLASSIFICATION_STATUS_CODES.DEPRECATED,
      CLASSIFICATION_TIMELINE_EVENT_TYPES.CLASSIFICATION_DEPRECATED,
      AUDIT_OPERATIONS.DEACTIVATE
    );
  }

  private async transitionClassificationStatus(
    context: CurrentBusinessContext,
    classificationId: string,
    nextStatus: (typeof PRODUCT_CLASSIFICATION_STATUS_CODES)[keyof typeof PRODUCT_CLASSIFICATION_STATUS_CODES],
    timelineEventType: string,
    auditOperation: string
  ): Promise<ProductClassificationWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const classification = await this.requireClassification(
      context,
      classificationId
    );

    if (
      !canTransitionClassificationStatus(
        classification.status as (typeof PRODUCT_CLASSIFICATION_STATUS_CODES)[keyof typeof PRODUCT_CLASSIFICATION_STATUS_CODES],
        nextStatus
      )
    ) {
      throw new ProductError(
        "INVALID_STATUS_TRANSITION",
        msg.INVALID_STATUS_TRANSITION,
        400
      );
    }

    if (nextStatus === PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED) {
      if (!canArchiveClassification(classification.status)) {
        throw new ProductError(
          "INVALID_INPUT",
          "Only active catalogue nodes can be archived.",
          400
        );
      }

      const activeChildren =
        await this.classificationRepository.countActiveChildren(
          context.businessId,
          classificationId
        );
      if (activeChildren > 0) {
        throw new ProductError(
          "CLASSIFICATION_HAS_ACTIVE_CHILDREN",
          msg.CLASSIFICATION_HAS_ACTIVE_CHILDREN,
          409
        );
      }

      const activeProducts =
        await this.assignmentRepository.countActiveByClassificationId(
          context.businessId,
          classificationId
        );
      if (activeProducts > 0) {
        throw new ProductError(
          "CLASSIFICATION_HAS_ACTIVE_PRODUCTS",
          msg.CLASSIFICATION_HAS_ACTIVE_PRODUCTS,
          409
        );
      }
    }

    await this.classificationRepository.updateById(
      context.businessId,
      classificationId,
      {
        status: nextStatus,
        retirementDate:
          nextStatus === PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED
            ? todayIsoDate()
            : classification.retirementDate,
        updatedBy: context.platformUserId,
      }
    );

    await this.recordClassificationTimeline(context, {
      classificationId,
      eventType: timelineEventType,
      eventCategory: CLASSIFICATION_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
      summary: `${classification.name} — ${classificationStatusLabel(nextStatus)}`,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId: classificationId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_CLASSIFICATION,
      entityId: classificationId,
      operation: auditOperation,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: { status: classification.status },
      after: { status: nextStatus },
      trackFields: ["status"],
    });

    return this.getClassificationWorkspace(context, classificationId);
  }

  async assignProduct(
    context: CurrentBusinessContext,
    productId: string,
    payload: AssignProductClassificationPayload
  ): Promise<ProductClassificationPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = assignProductClassificationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const product = await this.requireProduct(context, productId);
    if (product.statusCode === PRODUCT_STATUS_CODES.ARCHIVED) {
      throw new ProductError(
        "ARCHIVED_PRODUCT_IMMUTABLE",
        msg.ARCHIVED_PRODUCT_IMMUTABLE,
        400
      );
    }

    const classification = await this.requireClassification(
      context,
      parsed.data.classificationId
    );
    if (!canAssignToClassification(classification.status)) {
      throw new ProductError(
        "INACTIVE_CLASSIFICATION",
        msg.INACTIVE_CLASSIFICATION,
        400,
        "classificationId"
      );
    }

    const duplicate =
      await this.assignmentRepository.findActiveByProductAndClassification(
        context.businessId,
        productId,
        parsed.data.classificationId
      );
    if (duplicate) {
      throw new ProductError(
        "DUPLICATE_CLASSIFICATION_ASSIGNMENT",
        msg.DUPLICATE_CLASSIFICATION_ASSIGNMENT,
        409,
        "classificationId"
      );
    }

    const existingAssignments =
      await this.assignmentRepository.listActiveByProductId(
        context.businessId,
        productId
      );
    const makePrimary = shouldAssignAsPrimary(
      existingAssignments.length,
      parsed.data.isPrimary
    );

    const db = getDb();
    let assignmentId = "";
    await db.transaction(async (tx) => {
      if (makePrimary) {
        await this.assignmentRepository.clearPrimaryForProduct(
          context.businessId,
          productId,
          tx
        );
      }

      const inserted = await this.assignmentRepository.insert(
        {
          businessId: context.businessId,
          productId,
          classificationId: parsed.data.classificationId,
          isPrimary: makePrimary,
          effectiveDate: parsed.data.effectiveDate ?? todayIsoDate(),
          createdBy: context.platformUserId,
          updatedBy: context.platformUserId,
        },
        tx
      );
      assignmentId = inserted.id;
    });

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_ASSIGNED,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: `Assigned to ${classification.name}`,
        referenceEntity: "product_classification_assignment",
        referenceId: assignmentId,
      })
    );

    await this.recordClassificationTimeline(context, {
      classificationId: parsed.data.classificationId,
      eventType: CLASSIFICATION_TIMELINE_EVENT_TYPES.PRODUCT_ASSIGNED,
      eventCategory: CLASSIFICATION_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
      summary: `Product assigned — ${product.productName}`,
      referenceEntity: "product",
      referenceId: productId,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_CLASSIFICATION_ASSIGNMENT,
      entityId: assignmentId,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        classificationId: parsed.data.classificationId,
        isPrimary: makePrimary,
      },
    });

    return this.getProductClassifications(context, productId);
  }

  async removeAssignment(
    context: CurrentBusinessContext,
    productId: string,
    assignmentId: string
  ): Promise<ProductClassificationPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const product = await this.requireProduct(context, productId);
    const assignment = await this.assignmentRepository.findById(
      context.businessId,
      assignmentId
    );

    if (!assignment || assignment.productId !== productId) {
      throw new ProductError(
        "ASSIGNMENT_NOT_FOUND",
        msg.ASSIGNMENT_NOT_FOUND,
        404
      );
    }

    await this.assignmentRepository.retireById(
      context.businessId,
      assignmentId,
      todayIsoDate(),
      context.platformUserId
    );

    await this.timelineService.recordEvent(
      buildProductTimelineEventFromContext(context, {
        productId,
        eventType: PRODUCT_TIMELINE_EVENT_TYPES.PRODUCT_UNASSIGNED,
        eventCategory: PRODUCT_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
        summary: "Catalogue assignment removed",
        referenceEntity: "product_classification_assignment",
        referenceId: assignmentId,
      })
    );

    await this.recordClassificationTimeline(context, {
      classificationId: assignment.classificationId,
      eventType: CLASSIFICATION_TIMELINE_EVENT_TYPES.PRODUCT_UNASSIGNED,
      eventCategory: CLASSIFICATION_TIMELINE_EVENT_CATEGORIES.OPERATIONS,
      summary: `Product unassigned — ${product.productName}`,
      referenceEntity: "product",
      referenceId: productId,
    });

    await recordProductEntityAudit(this.auditService, context, {
      productId,
      ownerPartyId: product.ownerPartyId,
      entityName: AUDIT_ENTITY_NAMES.PRODUCT_CLASSIFICATION_ASSIGNMENT,
      entityId: assignmentId,
      operation: AUDIT_OPERATIONS.DELETE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
    });

    return this.getProductClassifications(context, productId);
  }

  async setPrimaryAssignment(
    context: CurrentBusinessContext,
    productId: string,
    payload: SetPrimaryClassificationPayload
  ): Promise<ProductClassificationPanelView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = setPrimaryClassificationSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    await this.requireProduct(context, productId);
    const assignment = await this.assignmentRepository.findById(
      context.businessId,
      parsed.data.assignmentId
    );

    if (!assignment || assignment.productId !== productId) {
      throw new ProductError(
        "ASSIGNMENT_NOT_FOUND",
        msg.ASSIGNMENT_NOT_FOUND,
        404
      );
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      await this.assignmentRepository.clearPrimaryForProduct(
        context.businessId,
        productId,
        tx
      );
      await this.assignmentRepository.updateById(
        context.businessId,
        parsed.data.assignmentId,
        { isPrimary: true, updatedBy: context.platformUserId },
        tx
      );
    });

    return this.getProductClassifications(context, productId);
  }

  private async requireClassification(
    context: CurrentBusinessContext,
    classificationId: string
  ): Promise<ProductClassificationView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const row = await this.classificationRepository.findById(
      context.businessId,
      classificationId
    );
    if (!row) {
      throw new ProductError(
        "CLASSIFICATION_NOT_FOUND",
        msg.CLASSIFICATION_NOT_FOUND,
        404
      );
    }
    const [view] = await this.mapViews(context.businessId, [row]);
    return view!;
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

  private async mapViews(
    businessId: string,
    rows: Array<{
      id: string;
      businessId: string;
      parentClassificationId: string | null;
      code: string;
      name: string;
      description: string | null;
      classificationTypeCode: string;
      industryCode: string | null;
      icon: string | null;
      displayOrder: number;
      hierarchyLevel: number;
      status: string;
      ownerPartyId: string | null;
      businessUnit: string | null;
      effectiveDate: string | null;
      effectiveTo: string | null;
      retirementDate: string | null;
      approvalStatus: string;
      reasonForChange: string | null;
      createdAt: Date;
      updatedAt: Date;
      version: number;
    }>
  ): Promise<ProductClassificationView[]> {
    const [typeRows, industryRows, ownerParties] = await Promise.all([
      this.referenceRepository.listActiveClassificationTypes(),
      this.referenceRepository.listActiveIndustries(),
      this.referenceRepository.listOwnerPartyOptions(businessId),
    ]);
    const typeNameByCode = new Map(typeRows.map((t) => [t.code, t.name]));
    const industryNameByCode = new Map(industryRows.map((i) => [i.code, i.name]));
    const ownerNameById = new Map(
      ownerParties.map((p) => [p.id, p.displayName])
    );
    const nameById = new Map(rows.map((row) => [row.id, row.name]));
    const childCounts = new Map<string, number>();
    for (const row of rows) {
      if (row.parentClassificationId) {
        childCounts.set(
          row.parentClassificationId,
          (childCounts.get(row.parentClassificationId) ?? 0) + 1
        );
      }
    }

    const productCounts = await Promise.all(
      rows.map(async (row) =>
        this.assignmentRepository.countAssignedProductsByStatus(
          businessId,
          row.id
        )
      )
    );

    return rows.map((row, index) => {
      const counts = productCounts[index] ?? { total: 0, active: 0, archived: 0 };
      return {
        id: row.id,
        businessId: row.businessId,
        parentClassificationId: row.parentClassificationId,
        parentName: row.parentClassificationId
          ? (nameById.get(row.parentClassificationId) ?? null)
          : null,
        code: row.code,
        name: row.name,
        description: row.description,
        classificationTypeCode: row.classificationTypeCode,
        classificationTypeName:
          typeNameByCode.get(row.classificationTypeCode) ??
          row.classificationTypeCode,
        industryCode: row.industryCode,
        industryName: row.industryCode
          ? (industryNameByCode.get(row.industryCode) ?? row.industryCode)
          : null,
        icon: row.icon,
        displayOrder: row.displayOrder,
        hierarchyLevel: row.hierarchyLevel,
        status: row.status,
        statusLabel: classificationStatusLabel(row.status),
        ownerPartyId: row.ownerPartyId,
        ownerDisplayName: row.ownerPartyId
          ? (ownerNameById.get(row.ownerPartyId) ?? null)
          : null,
        businessUnit: row.businessUnit,
        effectiveDate: row.effectiveDate,
        effectiveTo: row.effectiveTo,
        retirementDate: row.retirementDate,
        approvalStatus: row.approvalStatus,
        approvalStatusLabel: classificationApprovalStatusLabel(row.approvalStatus),
        reasonForChange: row.reasonForChange,
        childCount: childCounts.get(row.id) ?? 0,
        assignedProductCount: counts.total,
        activeProductCount: counts.active,
        archivedProductCount: counts.archived,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        version: row.version,
      };
    });
  }

  private async recordClassificationTimeline(
    context: CurrentBusinessContext,
    input: {
      classificationId: string;
      eventType: string;
      eventCategory: string;
      summary: string;
      referenceEntity?: string | null;
      referenceId?: string | null;
    }
  ) {
    await this.classificationTimelineService.recordEvent(
      buildClassificationTimelineEventFromContext(context, input)
    );
  }

  private toAssignmentView(
    row: AssignmentWithDetails
  ): ProductClassificationAssignmentView {
    return {
      id: row.assignment.id,
      productId: row.assignment.productId,
      productCode: row.productCode,
      productName: row.productName,
      classificationId: row.assignment.classificationId,
      classificationCode: row.classificationCode,
      classificationName: row.classificationName,
      isPrimary: row.assignment.isPrimary,
      effectiveDate: row.assignment.effectiveDate,
      retirementDate: row.assignment.retirementDate,
    };
  }

  private async recomputeDescendantLevels(
    businessId: string,
    rootId: string,
    rootLevel: number,
    allRows: Array<{
      id: string;
      parentClassificationId: string | null;
    }>
  ) {
    const childrenByParent = new Map<string, string[]>();
    for (const row of allRows) {
      if (row.parentClassificationId) {
        const siblings =
          childrenByParent.get(row.parentClassificationId) ?? [];
        siblings.push(row.id);
        childrenByParent.set(row.parentClassificationId, siblings);
      }
    }

    const updates: Array<{ id: string; hierarchyLevel: number }> = [];
    const queue: Array<{ id: string; level: number }> = [
      { id: rootId, level: rootLevel },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenByParent.get(current.id) ?? [];
      for (const childId of children) {
        const childLevel = current.level + 1;
        updates.push({ id: childId, hierarchyLevel: childLevel });
        queue.push({ id: childId, level: childLevel });
      }
    }

    if (updates.length > 0) {
      await this.classificationRepository.updateHierarchyLevels(
        businessId,
        updates
      );
    }
  }
}

export function createProductClassificationService() {
  return new ProductClassificationService();
}
