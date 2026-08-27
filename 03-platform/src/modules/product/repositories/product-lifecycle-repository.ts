/**
 * Purpose:
 * Persist and read Product Lifecycle rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productLifecycle } from "@/db/schema/product-lifecycle";
import type { ProductLifecycleStateCode } from "@/modules/product/constants";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductLifecycleInsertValues = {
  businessId: string;
  productId: string;
  currentState: ProductLifecycleStateCode | string;
  previousState?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  approvalRequired?: boolean;
  approvalStatus?: string | null;
  retirementReason?: string | null;
  replacementProductId?: string | null;
  versionNumber?: string;
  majorVersion?: number;
  minorVersion?: number;
  scheduledAction?: string | null;
  scheduledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ProductLifecycleUpdateValues = {
  currentState?: string;
  previousState?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  approvalRequired?: boolean;
  approvalStatus?: string | null;
  retirementReason?: string | null;
  replacementProductId?: string | null;
  versionNumber?: string;
  majorVersion?: number;
  minorVersion?: number;
  scheduledAction?: string | null;
  scheduledAt?: string | null;
  metadata?: Record<string, unknown> | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
};

export class ProductLifecycleRepository {
  async insert(
    values: ProductLifecycleInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productLifecycle)
      .values({
        businessId: values.businessId,
        productId: values.productId,
        currentState: values.currentState,
        previousState: values.previousState ?? null,
        effectiveFrom: values.effectiveFrom ?? null,
        effectiveTo: values.effectiveTo ?? null,
        approvalRequired: values.approvalRequired ?? false,
        approvalStatus: values.approvalStatus ?? null,
        retirementReason: values.retirementReason ?? null,
        replacementProductId: values.replacementProductId ?? null,
        versionNumber: values.versionNumber ?? "1.0",
        majorVersion: values.majorVersion ?? 1,
        minorVersion: values.minorVersion ?? 0,
        scheduledAction: values.scheduledAction ?? null,
        scheduledAt: values.scheduledAt ?? null,
        metadata: values.metadata ?? null,
        createdBy: values.createdBy ?? null,
        updatedBy: values.updatedBy ?? null,
      })
      .returning();

    return row;
  }

  async findByProductId(
    businessId: string,
    productId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productLifecycle)
      .where(
        and(
          eq(productLifecycle.businessId, businessId),
          eq(productLifecycle.productId, productId),
          isNull(productLifecycle.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async findById(
    businessId: string,
    lifecycleId: string,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .select()
      .from(productLifecycle)
      .where(
        and(
          eq(productLifecycle.businessId, businessId),
          eq(productLifecycle.id, lifecycleId),
          isNull(productLifecycle.deletedAt)
        )
      )
      .limit(1);

    return row ?? null;
  }

  async countByState(
    businessId: string,
    state: string,
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [row] = await dbClient
      .select({ value: count() })
      .from(productLifecycle)
      .where(
        and(
          eq(productLifecycle.businessId, businessId),
          eq(productLifecycle.currentState, state),
          isNull(productLifecycle.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async countActiveVersions(
    businessId: string,
    dbClient: DbClient = getDb()
  ): Promise<number> {
    const [row] = await dbClient
      .select({ value: count() })
      .from(productLifecycle)
      .where(
        and(
          eq(productLifecycle.businessId, businessId),
          eq(productLifecycle.currentState, "ACTIVE"),
          isNull(productLifecycle.deletedAt)
        )
      );

    return Number(row?.value ?? 0);
  }

  async listRecentlyChanged(
    businessId: string,
    limit = 10,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productLifecycle)
      .where(
        and(
          eq(productLifecycle.businessId, businessId),
          isNull(productLifecycle.deletedAt)
        )
      )
      .orderBy(desc(productLifecycle.updatedAt))
      .limit(limit);
  }

  async updateById(
    businessId: string,
    lifecycleId: string,
    values: ProductLifecycleUpdateValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .update(productLifecycle)
      .set({
        ...(values.currentState !== undefined
          ? { currentState: values.currentState }
          : {}),
        ...(values.previousState !== undefined
          ? { previousState: values.previousState }
          : {}),
        ...(values.effectiveFrom !== undefined
          ? { effectiveFrom: values.effectiveFrom }
          : {}),
        ...(values.effectiveTo !== undefined
          ? { effectiveTo: values.effectiveTo }
          : {}),
        ...(values.approvalRequired !== undefined
          ? { approvalRequired: values.approvalRequired }
          : {}),
        ...(values.approvalStatus !== undefined
          ? { approvalStatus: values.approvalStatus }
          : {}),
        ...(values.retirementReason !== undefined
          ? { retirementReason: values.retirementReason }
          : {}),
        ...(values.replacementProductId !== undefined
          ? { replacementProductId: values.replacementProductId }
          : {}),
        ...(values.versionNumber !== undefined
          ? { versionNumber: values.versionNumber }
          : {}),
        ...(values.majorVersion !== undefined
          ? { majorVersion: values.majorVersion }
          : {}),
        ...(values.minorVersion !== undefined
          ? { minorVersion: values.minorVersion }
          : {}),
        ...(values.scheduledAction !== undefined
          ? { scheduledAction: values.scheduledAction }
          : {}),
        ...(values.scheduledAt !== undefined
          ? { scheduledAt: values.scheduledAt }
          : {}),
        ...(values.metadata !== undefined ? { metadata: values.metadata } : {}),
        ...(values.deletedAt !== undefined
          ? { deletedAt: values.deletedAt }
          : {}),
        ...(values.updatedBy !== undefined
          ? { updatedBy: values.updatedBy }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productLifecycle.businessId, businessId),
          eq(productLifecycle.id, lifecycleId),
          isNull(productLifecycle.deletedAt)
        )
      )
      .returning();

    return row ?? null;
  }
}

export function createProductLifecycleRepository(): ProductLifecycleRepository {
  return new ProductLifecycleRepository();
}
