/**
 * Purpose:
 * Persist and read Product Classification Assignment rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-002 – Product Classification & Categorization
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { PRODUCT_STATUS_CODES } from "@/modules/product/constants";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { product } from "@/db/schema/product";
import { productClassification } from "@/db/schema/product-classification";
import { productClassificationAssignment } from "@/db/schema/product-classification-assignment";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductClassificationAssignmentInsertValues = {
  businessId: string;
  productId: string;
  classificationId: string;
  isPrimary?: boolean;
  effectiveDate?: string | null;
  retirementDate?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductClassificationAssignmentUpdateValues = {
  isPrimary?: boolean;
  effectiveDate?: string | null;
  retirementDate?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export type AssignmentWithDetails = {
  assignment: typeof productClassificationAssignment.$inferSelect;
  productCode: string;
  productName: string;
  classificationCode: string;
  classificationName: string;
};

export class ProductClassificationAssignmentRepository {
  async insert(
    values: ProductClassificationAssignmentInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productClassificationAssignment)
      .values({
        businessId: values.businessId,
        productId: values.productId,
        classificationId: values.classificationId,
        isPrimary: values.isPrimary ?? false,
        effectiveDate: values.effectiveDate ?? null,
        retirementDate: values.retirementDate ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findById(
    businessId: string,
    assignmentId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productClassificationAssignment)
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(productClassificationAssignment.id, assignmentId),
          isNull(productClassificationAssignment.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findActiveByProductAndClassification(
    businessId: string,
    productId: string,
    classificationId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productClassificationAssignment)
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(productClassificationAssignment.productId, productId),
          eq(
            productClassificationAssignment.classificationId,
            classificationId
          ),
          isNull(productClassificationAssignment.deletedAt),
          isNull(productClassificationAssignment.retirementDate)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async listActiveByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ): Promise<AssignmentWithDetails[]> {
    return dbClient
      .select({
        assignment: productClassificationAssignment,
        productCode: product.productCode,
        productName: product.productName,
        classificationCode: productClassification.code,
        classificationName: productClassification.name,
      })
      .from(productClassificationAssignment)
      .innerJoin(product, eq(productClassificationAssignment.productId, product.id))
      .innerJoin(
        productClassification,
        eq(
          productClassificationAssignment.classificationId,
          productClassification.id
        )
      )
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(productClassificationAssignment.productId, productId),
          isNull(productClassificationAssignment.deletedAt),
          isNull(productClassificationAssignment.retirementDate)
        )
      )
      .orderBy(
        sql`${productClassificationAssignment.isPrimary} DESC`,
        productClassification.name
      );
  }

  async listActiveByClassificationId(
    businessId: string,
    classificationId: string,
    dbClient: DbClient = getDb()
  ): Promise<AssignmentWithDetails[]> {
    return dbClient
      .select({
        assignment: productClassificationAssignment,
        productCode: product.productCode,
        productName: product.productName,
        classificationCode: productClassification.code,
        classificationName: productClassification.name,
      })
      .from(productClassificationAssignment)
      .innerJoin(product, eq(productClassificationAssignment.productId, product.id))
      .innerJoin(
        productClassification,
        eq(
          productClassificationAssignment.classificationId,
          productClassification.id
        )
      )
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(
            productClassificationAssignment.classificationId,
            classificationId
          ),
          isNull(productClassificationAssignment.deletedAt),
          isNull(productClassificationAssignment.retirementDate)
        )
      )
      .orderBy(product.productName);
  }

  async countActiveByClassificationId(
    businessId: string,
    classificationId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select({ value: sql<number>`count(*)::int` })
      .from(productClassificationAssignment)
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(
            productClassificationAssignment.classificationId,
            classificationId
          ),
          isNull(productClassificationAssignment.deletedAt),
          isNull(productClassificationAssignment.retirementDate)
        )
      );

    return Number(row?.value ?? 0);
  }

  async clearPrimaryForProduct(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    await dbClient
      .update(productClassificationAssignment)
      .set({
        isPrimary: false,
        updatedAt: new Date(),
        version: sql`${productClassificationAssignment.version} + 1`,
      })
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(productClassificationAssignment.productId, productId),
          isNull(productClassificationAssignment.deletedAt),
          isNull(productClassificationAssignment.retirementDate)
        )
      );
  }

  async updateById(
    businessId: string,
    assignmentId: string,
    values: ProductClassificationAssignmentUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productClassificationAssignment)
      .set({
        ...values,
        updatedAt: new Date(),
        version: sql`${productClassificationAssignment.version} + 1`,
      })
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(productClassificationAssignment.id, assignmentId),
          isNull(productClassificationAssignment.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async retireById(
    businessId: string,
    assignmentId: string,
    retirementDate: string,
    updatedBy: string | null,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productClassificationAssignment)
      .set({
        isPrimary: false,
        retirementDate,
        updatedBy,
        updatedAt: new Date(),
        version: sql`${productClassificationAssignment.version} + 1`,
      })
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(productClassificationAssignment.id, assignmentId),
          isNull(productClassificationAssignment.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }

  async countAssignedProductsByStatus(
    businessId: string,
    classificationId: string,
    dbClient: DbClient = getDb()
  ) {
    const rows = await dbClient
      .select({
        statusCode: product.statusCode,
        value: sql<number>`count(*)::int`,
      })
      .from(productClassificationAssignment)
      .innerJoin(product, eq(productClassificationAssignment.productId, product.id))
      .where(
        and(
          eq(productClassificationAssignment.businessId, businessId),
          eq(
            productClassificationAssignment.classificationId,
            classificationId
          ),
          isNull(productClassificationAssignment.deletedAt),
          isNull(productClassificationAssignment.retirementDate)
        )
      )
      .groupBy(product.statusCode);

    let total = 0;
    let active = 0;
    let archived = 0;

    for (const row of rows) {
      const count = Number(row.value ?? 0);
      total += count;
      if (row.statusCode === PRODUCT_STATUS_CODES.ACTIVE) {
        active += count;
      }
      if (row.statusCode === PRODUCT_STATUS_CODES.ARCHIVED) {
        archived += count;
      }
    }

    return { total, active, archived };
  }
}

export function createProductClassificationAssignmentRepository() {
  return new ProductClassificationAssignmentRepository();
}
