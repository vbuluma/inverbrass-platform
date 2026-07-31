/**
 * Purpose:
 * Persist and read Product Classification rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import { and, asc, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productClassification } from "@/db/schema/product-classification";
import { PRODUCT_CLASSIFICATION_STATUS_CODES } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductClassificationInsertValues = {
  businessId: string;
  parentClassificationId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  classificationTypeCode?: string;
  industryCode?: string | null;
  icon?: string | null;
  displayOrder?: number;
  hierarchyLevel?: number;
  status: string;
  ownerPartyId?: string | null;
  businessUnit?: string | null;
  effectiveDate?: string | null;
  effectiveTo?: string | null;
  retirementDate?: string | null;
  approvalStatus?: string;
  reasonForChange?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductClassificationUpdateValues = {
  parentClassificationId?: string | null;
  name?: string;
  description?: string | null;
  classificationTypeCode?: string;
  industryCode?: string | null;
  icon?: string | null;
  displayOrder?: number;
  hierarchyLevel?: number;
  status?: string;
  ownerPartyId?: string | null;
  businessUnit?: string | null;
  effectiveDate?: string | null;
  effectiveTo?: string | null;
  retirementDate?: string | null;
  approvalStatus?: string;
  reasonForChange?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class ProductClassificationRepository {
  async insert(
    values: ProductClassificationInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productClassification)
      .values({
        businessId: values.businessId,
        parentClassificationId: values.parentClassificationId ?? null,
        code: values.code,
        name: values.name,
        description: values.description ?? null,
        classificationTypeCode: values.classificationTypeCode ?? "CATEGORY",
        industryCode: values.industryCode ?? null,
        icon: values.icon ?? null,
        displayOrder: values.displayOrder ?? 0,
        hierarchyLevel: values.hierarchyLevel ?? 0,
        status: values.status,
        ownerPartyId: values.ownerPartyId ?? null,
        businessUnit: values.businessUnit ?? null,
        effectiveDate: values.effectiveDate ?? null,
        effectiveTo: values.effectiveTo ?? null,
        retirementDate: values.retirementDate ?? null,
        approvalStatus: values.approvalStatus ?? "NOT_REQUIRED",
        reasonForChange: values.reasonForChange ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    classificationId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          eq(productClassification.id, classificationId),
          isNull(productClassification.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findByCode(
    businessId: string,
    code: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          eq(productClassification.code, code),
          isNull(productClassification.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listByBusinessId(
    businessId: string,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          isNull(productClassification.deletedAt)
        )
      )
      .orderBy(
        asc(productClassification.hierarchyLevel),
        asc(productClassification.displayOrder),
        asc(productClassification.name)
      );
  }

  async listChildren(
    businessId: string,
    parentClassificationId: string | null,
    dbClient: DbClient = getDb()
  ) {
    const condition =
      parentClassificationId === null
        ? isNull(productClassification.parentClassificationId)
        : eq(
            productClassification.parentClassificationId,
            parentClassificationId
          );

    return dbClient
      .select()
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          condition,
          isNull(productClassification.deletedAt)
        )
      )
      .orderBy(
        asc(productClassification.displayOrder),
        asc(productClassification.name)
      );
  }

  async countActiveChildren(
    businessId: string,
    parentClassificationId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          eq(
            productClassification.parentClassificationId,
            parentClassificationId
          ),
          sql`${productClassification.status} <> ${PRODUCT_CLASSIFICATION_STATUS_CODES.ARCHIVED}`,
          isNull(productClassification.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async search(
    businessId: string,
    filters: {
      query?: string;
      status?: string;
      parentClassificationId?: string | null;
    },
    dbClient: DbClient = getDb()
  ) {
    const conditions = [
      eq(productClassification.businessId, businessId),
      isNull(productClassification.deletedAt),
    ];

    if (filters.status) {
      conditions.push(eq(productClassification.status, filters.status));
    }

    if (filters.parentClassificationId !== undefined) {
      if (filters.parentClassificationId === null) {
        conditions.push(isNull(productClassification.parentClassificationId));
      } else {
        conditions.push(
          eq(
            productClassification.parentClassificationId,
            filters.parentClassificationId
          )
        );
      }
    }

    const trimmedQuery = filters.query?.trim();
    if (trimmedQuery) {
      const pattern = `%${trimmedQuery}%`;
      conditions.push(
        or(
          ilike(productClassification.code, pattern),
          ilike(productClassification.name, pattern),
          ilike(productClassification.description, pattern)
        )!
      );
    }

    return dbClient
      .select()
      .from(productClassification)
      .where(and(...conditions))
      .orderBy(
        asc(productClassification.hierarchyLevel),
        asc(productClassification.displayOrder),
        asc(productClassification.name)
      );
  }

  async updateById(
    businessId: string,
    classificationId: string,
    values: ProductClassificationUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productClassification)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${productClassification.version} + 1`,
      })
      .where(
        and(
          eq(productClassification.businessId, businessId),
          eq(productClassification.id, classificationId),
          isNull(productClassification.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async updateHierarchyLevels(
    businessId: string,
    updates: Array<{ id: string; hierarchyLevel: number }>,
    dbClient: DbClient = getDb()
  ) {
    for (const update of updates) {
      await dbClient
        .update(productClassification)
        .set({
          hierarchyLevel: update.hierarchyLevel,
          updatedAt: new Date(),
          version: sql`${productClassification.version} + 1`,
        })
        .where(
          and(
            eq(productClassification.businessId, businessId),
            eq(productClassification.id, update.id),
            isNull(productClassification.deletedAt)
          )
        );
    }
  }

  async countByBusinessId(businessId: string, dbClient: DbClient = getDb()) {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          isNull(productClassification.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async countByStatus(
    businessId: string,
    status: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          eq(productClassification.status, status),
          isNull(productClassification.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async listRecentlyUpdated(
    businessId: string,
    limit = 5,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productClassification)
      .where(
        and(
          eq(productClassification.businessId, businessId),
          isNull(productClassification.deletedAt)
        )
      )
      .orderBy(desc(productClassification.updatedAt))
      .limit(limit);
  }
}

export function createProductClassificationRepository() {
  return new ProductClassificationRepository();
}
