/**
 * Purpose:
 * Persist and read Product Lifecycle event rows (persistence only).
 *
 * Implementation Package:
 * BP-003 / IP-008 – Product Lifecycle Management
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { productLifecycleEvent } from "@/db/schema/product-lifecycle-event";

type DbClient = PostgresJsDatabase<typeof schema>;

export type ProductLifecycleEventInsertValues = {
  businessId: string;
  productId: string;
  eventType: string;
  oldState?: string | null;
  newState?: string | null;
  reason?: string | null;
  performedBy?: string | null;
  metadata?: Record<string, unknown> | null;
};

export class ProductLifecycleEventRepository {
  async insert(
    values: ProductLifecycleEventInsertValues,
    dbClient: DbClient = getDb()
  ) {
    const [row] = await dbClient
      .insert(productLifecycleEvent)
      .values({
        businessId: values.businessId,
        productId: values.productId,
        eventType: values.eventType,
        oldState: values.oldState ?? null,
        newState: values.newState ?? null,
        reason: values.reason ?? null,
        performedBy: values.performedBy ?? null,
        metadata: values.metadata ?? null,
      })
      .returning();

    return row;
  }

  async listByProductId(
    businessId: string,
    productId: string,
    limit = 50,
    dbClient: DbClient = getDb()
  ) {
    return dbClient
      .select()
      .from(productLifecycleEvent)
      .where(
        and(
          eq(productLifecycleEvent.businessId, businessId),
          eq(productLifecycleEvent.productId, productId)
        )
      )
      .orderBy(desc(productLifecycleEvent.performedAt))
      .limit(limit);
  }
}

export function createProductLifecycleEventRepository(): ProductLifecycleEventRepository {
  return new ProductLifecycleEventRepository();
}
