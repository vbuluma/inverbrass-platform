/**
 * Purpose:
 * Persist tenant-scoped inventory inbound idempotency keys.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryIdempotency } from "@/db/schema/inventory-idempotency";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InventoryIdempotencyPort } from "@/modules/inventory/ports";
import type {
  InventoryIdempotencyInsert,
  InventoryIdempotencyRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof inventoryIdempotency.$inferSelect): InventoryIdempotencyRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    idempotencyKey: row.idempotencyKey,
    operationType: row.operationType,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class InventoryIdempotencyRepository implements InventoryIdempotencyPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryIdempotencyInsert): Promise<InventoryIdempotencyRecord> {
    try {
      const [row] = await this.db
        .insert(inventoryIdempotency)
        .values({
          businessId: values.businessId,
          idempotencyKey: values.idempotencyKey,
          operationType: values.operationType,
          resourceType: values.resourceType,
          resourceId: values.resourceId,
          createdBy: values.createdBy,
        })
        .returning();
      if (!row) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("inventory_idempotency_business_operation_key_uidx")) {
        const existing = await this.find(
          values.businessId,
          values.operationType,
          values.idempotencyKey
        );
        if (existing) {
          return existing;
        }
      }
      throw error;
    }
  }

  async find(businessId: string, operationType: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryIdempotency)
      .where(
        and(
          eq(inventoryIdempotency.businessId, businessId),
          eq(inventoryIdempotency.operationType, operationType),
          eq(inventoryIdempotency.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }
}

export function createInventoryIdempotencyRepository() {
  return new InventoryIdempotencyRepository();
}
