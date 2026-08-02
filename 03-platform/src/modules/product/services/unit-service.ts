/**
 * Purpose:
 * Units of Measure Engine — CRUD, lifecycle, conversions, and bootstrap.
 *
 * Architecture:
 * Server Actions → UnitService → Repositories → Drizzle
 *
 * Implementation Package:
 * BP-003 / IP-003 – Units of Measure Engine
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  AUDIT_ENTITY_NAMES,
  AUDIT_OPERATIONS,
  AUDIT_SOURCE_MODULES,
  createAuditService,
} from "@/core/audit";
import {
  buildUnitTimelineEventFromContext,
  createUnitTimelineService,
  UNIT_TIMELINE_EVENT_CATEGORIES,
  UNIT_TIMELINE_EVENT_TYPES,
} from "@/core/unit-timeline";
import { getDb } from "@/db/client";
import { seedDefaultUnitsForBusiness } from "@/db/seeds/unit-defaults-seed";
import { createIndustryExperienceService } from "@/core/industry-experience/services/industry-experience-service";
import { DEFAULT_OFFERING_WORKSPACE_LABEL } from "@/core/industry-experience/offering-terminology";
import {
  UNIT_ROUNDING_RULES,
  UNIT_STATUS_CODES,
} from "@/modules/product/constants";
import { ProductError } from "@/modules/product/errors";
import { resolveProductUserMessagesForContext } from "@/modules/product/resolve-product-user-messages";
import { createUnitCategoryRepository } from "@/modules/product/repositories/unit-category-repository";
import { createUnitRepository } from "@/modules/product/repositories/unit-repository";
import { recordProductEntityAudit } from "@/modules/product/services/product-audit-helper";
import { createUnitAuditQueryService } from "@/modules/product/services/unit-audit-query-service";
import { createUnitConversionService } from "@/modules/product/services/unit-conversion-service";
import {
  canTransitionUnitStatus,
  formatConversionDescription,
  isUnitEditable,
  isValidConversionFactor,
  normalizeUnitCode,
  normalizeUnitSymbol,
  parseConversionFactor,
  resolveDefaultUnitStatus,
  roundingRuleLabel,
  unitStatusLabel,
} from "@/modules/product/services/unit-rules";
import type {
  ConvertUnitsPayload,
  CreateUnitPayload,
  SearchUnitsPayload,
  UnitCategoryView,
  UnitDashboardView,
  UnitRegistrationCataloguesView,
  UnitView,
  UnitWorkspaceView,
  UpdateUnitPayload,
} from "@/modules/product/types";
import {
  convertUnitsSchema,
  createUnitSchema,
  searchUnitsSchema,
  updateUnitSchema,
} from "@/modules/product/validators/unit-validators";

type UnitRowWithCategory = {
  unit: {
    id: string;
    businessId: string;
    categoryId: string;
    code: string;
    name: string;
    symbol: string;
    conversionFactor: string;
    decimalPrecision: number;
    roundingRule: string;
    isBaseUnit: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  categoryCode: string;
  categoryName: string;
};

export class UnitService {
  constructor(
    private readonly categoryRepository = createUnitCategoryRepository(),
    private readonly unitRepository = createUnitRepository(),
    private readonly timelineService = createUnitTimelineService(),
    private readonly auditService = createAuditService(),
    private readonly conversionService = createUnitConversionService(),
    private readonly auditQueryService = createUnitAuditQueryService(),
    private readonly industryExperienceService = createIndustryExperienceService()
  ) {}

  async ensureDefaults(context: CurrentBusinessContext): Promise<void> {
    const db = getDb();
    await seedDefaultUnitsForBusiness(
      context.businessId,
      db,
      context.platformUserId
    );
  }

  async getDashboard(context: CurrentBusinessContext): Promise<UnitDashboardView> {
    await this.ensureDefaults(context);

    const profile = await this.industryExperienceService.getBusinessIndustryContext(
      context.businessId
    );

    const [unitRows, categories, activeUnits, categoryCount] = await Promise.all([
      this.unitRepository.listByBusinessId(context.businessId),
      this.categoryRepository.listByBusinessId(context.businessId),
      this.unitRepository.countActiveUnits(context.businessId),
      this.categoryRepository.countByBusinessId(context.businessId),
    ]);

    const views = unitRows.map((row) => this.mapUnitView(row));
    const categoryViews = await this.mapCategoryViews(context.businessId, categories, views);

    return {
      totalUnits: views.length,
      activeUnits,
      categoryCount,
      recentlyUpdated: views
        .slice()
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 8),
      categories: categoryViews,
      units: views,
      roundingRules: Object.values(UNIT_ROUNDING_RULES).map((code) => ({
        code,
        label: roundingRuleLabel(code),
      })),
      catalogueLabel: profile.offeringWorkspaceLabel ?? DEFAULT_OFFERING_WORKSPACE_LABEL,
    };
  }

  async getRegistrationCatalogues(
    context: CurrentBusinessContext
  ): Promise<UnitRegistrationCataloguesView> {
    await this.ensureDefaults(context);
    const categories = await this.categoryRepository.listByBusinessId(
      context.businessId
    );

    return {
      categories: categories.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
      })),
      roundingRules: Object.values(UNIT_ROUNDING_RULES).map((code) => ({
        code,
        label: roundingRuleLabel(code),
      })),
      defaultStatus: resolveDefaultUnitStatus(),
    };
  }

  async searchUnits(
    context: CurrentBusinessContext,
    payload: SearchUnitsPayload
  ): Promise<UnitView[]> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.ensureDefaults(context);
    const parsed = searchUnitsSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const rows = await this.unitRepository.search(
      context.businessId,
      parsed.data
    );
    return rows.map((row) => this.mapUnitView(row));
  }

  async getUnitWorkspace(
    context: CurrentBusinessContext,
    unitId: string
  ): Promise<UnitWorkspaceView> {
    await this.ensureDefaults(context);
    const unit = await this.requireUnit(context, unitId);
    const view = await this.mapSingleUnitView(context.businessId, unit);

    const categoryUnits = (
      await this.unitRepository.listByCategoryId(
        context.businessId,
        unit.categoryId
      )
    ).map((row) =>
      this.mapUnitView({
        unit: row,
        categoryCode: view.categoryCode,
        categoryName: view.categoryName,
      })
    );

    const fromFactor = parseConversionFactor(unit.conversionFactor);
    const conversionExamples = categoryUnits
      .filter((item) => item.id !== unit.id)
      .map((target) => ({
        targetUnitId: target.id,
        targetUnitName: target.name,
        targetUnitSymbol: target.symbol,
        description: formatConversionDescription(
          unit.name,
          unit.symbol,
          fromFactor,
          target.name,
          target.symbol,
          parseConversionFactor(target.conversionFactor)
        ),
      }));

    const [timeline, audit] = await Promise.all([
      this.timelineService.getTimelinePanel(context.businessId, unitId),
      this.auditQueryService.getAuditPanel(context, unitId),
    ]);

    return {
      unit: view,
      categoryUnits,
      conversionExamples,
      timeline,
      audit,
    };
  }

  async createUnit(
    context: CurrentBusinessContext,
    payload: CreateUnitPayload
  ): Promise<UnitWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    await this.ensureDefaults(context);
    const parsed = createUnitSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400,
        first?.path[0] ? String(first.path[0]) : undefined
      );
    }

    const data = parsed.data;
    const code = normalizeUnitCode(data.code);
    const symbol = normalizeUnitSymbol(data.symbol);
    const category = await this.categoryRepository.findById(
      context.businessId,
      data.categoryId
    );

    if (!category) {
      throw new ProductError(
        "UNIT_CATEGORY_NOT_FOUND",
        msg.UNIT_CATEGORY_NOT_FOUND,
        404,
        "categoryId"
      );
    }

    if (
      await this.unitRepository.findByCode(context.businessId, code)
    ) {
      throw new ProductError(
        "DUPLICATE_UNIT_CODE",
        msg.DUPLICATE_UNIT_CODE,
        409,
        "code"
      );
    }

    if (
      await this.unitRepository.findBySymbolInCategory(
        context.businessId,
        data.categoryId,
        symbol
      )
    ) {
      throw new ProductError(
        "DUPLICATE_UNIT_SYMBOL",
        msg.DUPLICATE_UNIT_SYMBOL,
        409,
        "symbol"
      );
    }

    const isBaseUnit = data.isBaseUnit ?? false;
    if (isBaseUnit) {
      const existingBase = await this.unitRepository.countBaseUnitsInCategory(
        context.businessId,
        data.categoryId
      );
      if (existingBase > 0) {
        throw new ProductError(
          "MULTIPLE_BASE_UNITS",
          msg.MULTIPLE_BASE_UNITS,
          400,
          "isBaseUnit"
        );
      }
    }

    const conversionFactor = String(data.conversionFactor);
    if (!isValidConversionFactor(data.conversionFactor)) {
      throw new ProductError(
        "INVALID_CONVERSION_FACTOR",
        msg.INVALID_CONVERSION_FACTOR,
        400,
        "conversionFactor"
      );
    }

    const status = data.status ?? resolveDefaultUnitStatus();

    const created = await this.unitRepository.insert({
      businessId: context.businessId,
      categoryId: data.categoryId,
      code,
      name: data.name.trim(),
      symbol,
      conversionFactor,
      decimalPrecision: data.decimalPrecision,
      roundingRule: data.roundingRule,
      isBaseUnit,
      status,
      createdBy: context.platformUserId,
      updatedBy: context.platformUserId,
    });

    if (isBaseUnit) {
      await this.categoryRepository.updateById(
        context.businessId,
        data.categoryId,
        { baseUnitId: created.id, updatedBy: context.platformUserId }
      );
    }

    await this.timelineService.recordEvent(
      buildUnitTimelineEventFromContext(context, {
        unitId: created.id,
        eventType: UNIT_TIMELINE_EVENT_TYPES.UNIT_CREATED,
        eventCategory: UNIT_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: `Unit ${created.code} registered`,
        description: `${created.name} (${created.symbol}) added to ${category.name}.`,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: created.id,
      entityName: AUDIT_ENTITY_NAMES.UNIT_OF_MEASURE,
      entityId: created.id,
      operation: AUDIT_OPERATIONS.CREATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      createValues: {
        code: created.code,
        name: created.name,
        symbol: created.symbol,
        categoryId: created.categoryId,
        conversionFactor: created.conversionFactor,
        decimalPrecision: created.decimalPrecision,
        status: created.status,
      },
    });

    return this.getUnitWorkspace(context, created.id);
  }

  async updateUnit(
    context: CurrentBusinessContext,
    unitId: string,
    payload: UpdateUnitPayload
  ): Promise<UnitWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = updateUnitSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    const before = await this.requireUnit(context, unitId);
    if (!isUnitEditable(before.status)) {
      throw new ProductError(
        "ARCHIVED_UNIT_IMMUTABLE",
        msg.ARCHIVED_UNIT_IMMUTABLE,
        400
      );
    }

    const updates: Record<string, unknown> = {
      updatedBy: context.platformUserId,
    };

    if (parsed.data.name !== undefined) {
      updates.name = parsed.data.name.trim();
    }
    if (parsed.data.symbol !== undefined) {
      const symbol = normalizeUnitSymbol(parsed.data.symbol);
      const duplicate = await this.unitRepository.findBySymbolInCategory(
        context.businessId,
        before.categoryId,
        symbol,
        unitId
      );
      if (duplicate) {
        throw new ProductError(
          "DUPLICATE_UNIT_SYMBOL",
          msg.DUPLICATE_UNIT_SYMBOL,
          409,
          "symbol"
        );
      }
      updates.symbol = symbol;
    }
    if (parsed.data.conversionFactor !== undefined) {
      if (!isValidConversionFactor(parsed.data.conversionFactor)) {
        throw new ProductError(
          "INVALID_CONVERSION_FACTOR",
          msg.INVALID_CONVERSION_FACTOR,
          400,
          "conversionFactor"
        );
      }
      updates.conversionFactor = String(parsed.data.conversionFactor);
    }
    if (parsed.data.decimalPrecision !== undefined) {
      updates.decimalPrecision = parsed.data.decimalPrecision;
    }
    if (parsed.data.roundingRule !== undefined) {
      updates.roundingRule = parsed.data.roundingRule;
    }
    if (parsed.data.isBaseUnit !== undefined) {
      if (parsed.data.isBaseUnit) {
        const existingBase = await this.unitRepository.countBaseUnitsInCategory(
          context.businessId,
          before.categoryId,
          unitId
        );
        if (existingBase > 0) {
          throw new ProductError(
            "MULTIPLE_BASE_UNITS",
            msg.MULTIPLE_BASE_UNITS,
            400,
            "isBaseUnit"
          );
        }
        updates.isBaseUnit = true;
        updates.conversionFactor = "1";
      } else if (before.isBaseUnit) {
        throw new ProductError(
          "INVALID_INPUT",
          "Assign another base unit before removing base status from this unit.",
          400,
          "isBaseUnit"
        );
      }
    }

    const updated = await this.unitRepository.updateById(
      context.businessId,
      unitId,
      updates
    );

    if (!updated) {
      throw new ProductError(
        "UNIT_NOT_FOUND",
        msg.UNIT_NOT_FOUND,
        404
      );
    }

    if (parsed.data.isBaseUnit) {
      await this.categoryRepository.updateById(
        context.businessId,
        before.categoryId,
        { baseUnitId: unitId, updatedBy: context.platformUserId }
      );
    }

    const conversionChanged =
      parsed.data.conversionFactor !== undefined ||
      parsed.data.isBaseUnit !== undefined;

    await this.timelineService.recordEvent(
      buildUnitTimelineEventFromContext(context, {
        unitId,
        eventType: conversionChanged
          ? UNIT_TIMELINE_EVENT_TYPES.UNIT_CONVERSION_CHANGED
          : UNIT_TIMELINE_EVENT_TYPES.UNIT_UPDATED,
        eventCategory: conversionChanged
          ? UNIT_TIMELINE_EVENT_CATEGORIES.OPERATIONS
          : UNIT_TIMELINE_EVENT_CATEGORIES.REGISTRATION,
        summary: conversionChanged
          ? `Conversion updated for ${updated.code}`
          : `Unit ${updated.code} updated`,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: unitId,
      entityName: AUDIT_ENTITY_NAMES.UNIT_OF_MEASURE,
      entityId: unitId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: {
        name: before.name,
        symbol: before.symbol,
        conversionFactor: before.conversionFactor,
        decimalPrecision: before.decimalPrecision,
        roundingRule: before.roundingRule,
        status: before.status,
      },
      after: {
        name: updated.name,
        symbol: updated.symbol,
        conversionFactor: updated.conversionFactor,
        decimalPrecision: updated.decimalPrecision,
        roundingRule: updated.roundingRule,
        status: updated.status,
      },
      trackFields: [
        "name",
        "symbol",
        "conversionFactor",
        "decimalPrecision",
        "roundingRule",
        "status",
      ],
    });

    return this.getUnitWorkspace(context, unitId);
  }

  async activateUnit(
    context: CurrentBusinessContext,
    unitId: string
  ): Promise<UnitWorkspaceView> {
    return this.transitionStatus(
      context,
      unitId,
      UNIT_STATUS_CODES.ACTIVE,
      UNIT_TIMELINE_EVENT_TYPES.UNIT_ACTIVATED,
      "Unit activated"
    );
  }

  async suspendUnit(
    context: CurrentBusinessContext,
    unitId: string
  ): Promise<UnitWorkspaceView> {
    return this.transitionStatus(
      context,
      unitId,
      UNIT_STATUS_CODES.SUSPENDED,
      UNIT_TIMELINE_EVENT_TYPES.UNIT_SUSPENDED,
      "Unit suspended"
    );
  }

  async archiveUnit(
    context: CurrentBusinessContext,
    unitId: string
  ): Promise<UnitWorkspaceView> {
    return this.transitionStatus(
      context,
      unitId,
      UNIT_STATUS_CODES.ARCHIVED,
      UNIT_TIMELINE_EVENT_TYPES.UNIT_ARCHIVED,
      "Unit archived"
    );
  }

  async convertUnits(
    context: CurrentBusinessContext,
    payload: ConvertUnitsPayload
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const parsed = convertUnitsSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      throw new ProductError(
        "INVALID_INPUT",
        first?.message ?? msg.INVALID_INPUT,
        400
      );
    }

    return this.conversionService.convertByIds(
      context,
      parsed.data.fromUnitId,
      parsed.data.toUnitId,
      parsed.data.value
    );
  }

  private async transitionStatus(
    context: CurrentBusinessContext,
    unitId: string,
    nextStatus: string,
    eventType: string,
    summary: string
  ): Promise<UnitWorkspaceView> {
    const msg = await resolveProductUserMessagesForContext(context);
    const unit = await this.requireUnit(context, unitId);

    if (!canTransitionUnitStatus(unit.status, nextStatus)) {
      throw new ProductError(
        "INVALID_UNIT_STATUS_TRANSITION",
        msg.INVALID_UNIT_STATUS_TRANSITION,
        400
      );
    }

    const updated = await this.unitRepository.updateById(
      context.businessId,
      unitId,
      { status: nextStatus, updatedBy: context.platformUserId }
    );

    if (!updated) {
      throw new ProductError(
        "UNIT_NOT_FOUND",
        msg.UNIT_NOT_FOUND,
        404
      );
    }

    await this.timelineService.recordEvent(
      buildUnitTimelineEventFromContext(context, {
        unitId,
        eventType,
        eventCategory: UNIT_TIMELINE_EVENT_CATEGORIES.LIFECYCLE,
        summary: `${summary}: ${updated.code}`,
      })
    );

    await recordProductEntityAudit(this.auditService, context, {
      productId: unitId,
      entityName: AUDIT_ENTITY_NAMES.UNIT_OF_MEASURE,
      entityId: unitId,
      operation: AUDIT_OPERATIONS.UPDATE,
      sourceModule: AUDIT_SOURCE_MODULES.PRODUCT_MANAGEMENT,
      before: { status: unit.status },
      after: { status: nextStatus },
      trackFields: ["status"],
    });

    return this.getUnitWorkspace(context, unitId);
  }

  private async requireUnit(
    context: CurrentBusinessContext,
    unitId: string
  ) {
    const msg = await resolveProductUserMessagesForContext(context);
    const unit = await this.unitRepository.findById(context.businessId, unitId);
    if (!unit) {
      throw new ProductError(
        "UNIT_NOT_FOUND",
        msg.UNIT_NOT_FOUND,
        404
      );
    }
    return unit;
  }

  private mapUnitView(row: UnitRowWithCategory): UnitView {
    return {
      id: row.unit.id,
      businessId: row.unit.businessId,
      categoryId: row.unit.categoryId,
      categoryCode: row.categoryCode,
      categoryName: row.categoryName,
      code: row.unit.code,
      name: row.unit.name,
      symbol: row.unit.symbol,
      conversionFactor: row.unit.conversionFactor,
      decimalPrecision: row.unit.decimalPrecision,
      roundingRule: row.unit.roundingRule,
      roundingRuleLabel: roundingRuleLabel(row.unit.roundingRule),
      isBaseUnit: row.unit.isBaseUnit,
      status: row.unit.status,
      statusLabel: unitStatusLabel(row.unit.status),
      createdAt: row.unit.createdAt.toISOString(),
      updatedAt: row.unit.updatedAt.toISOString(),
    };
  }

  private async mapSingleUnitView(businessId: string, unit: {
    id: string;
    businessId: string;
    categoryId: string;
    code: string;
    name: string;
    symbol: string;
    conversionFactor: string;
    decimalPrecision: number;
    roundingRule: string;
    isBaseUnit: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<UnitView> {
    const category = await this.categoryRepository.findById(
      businessId,
      unit.categoryId
    );

    return this.mapUnitView({
      unit,
      categoryCode: category?.code ?? "",
      categoryName: category?.name ?? "",
    });
  }

  private async mapCategoryViews(
    businessId: string,
    categories: Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      baseUnitId: string | null;
      status: string;
    }>,
    units: UnitView[]
  ): Promise<UnitCategoryView[]> {
    const unitById = new Map(units.map((unit) => [unit.id, unit]));

    return categories.map((category) => {
      const baseUnit = category.baseUnitId
        ? unitById.get(category.baseUnitId)
        : null;
      const unitCount = units.filter((unit) => unit.categoryId === category.id).length;

      return {
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description,
        baseUnitId: category.baseUnitId,
        baseUnitName: baseUnit?.name ?? null,
        baseUnitSymbol: baseUnit?.symbol ?? null,
        status: category.status,
        unitCount,
      };
    });
  }
}

export function createUnitService() {
  return new UnitService();
}
