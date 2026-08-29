/**
 * Purpose:
 * Resolve inventory operation controls with optional business override.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryOperationControl } from "@/db/schema/inventory-operation-control";
import { inventoryOperationPolicy } from "@/db/schema/inventory-operation-policy";
import type { InventoryOperationControlPort } from "@/modules/inventory/ports";
import type { InventoryOperationControl } from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

export class InventoryOperationControlRepository implements InventoryOperationControlPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async getControl(
    businessId: string,
    operationCode: string
  ): Promise<InventoryOperationControl | null> {
    const [platform] = await this.db
      .select()
      .from(inventoryOperationControl)
      .where(
        and(
          eq(inventoryOperationControl.code, operationCode),
          eq(inventoryOperationControl.isActive, true)
        )
      )
      .limit(1);
    if (!platform) {
      return null;
    }
    const [override] = await this.db
      .select()
      .from(inventoryOperationPolicy)
      .where(
        and(
          eq(inventoryOperationPolicy.businessId, businessId),
          eq(inventoryOperationPolicy.operationCode, operationCode)
        )
      )
      .limit(1);
    return {
      code: platform.code,
      name: platform.name,
      movementType: platform.movementType,
      requiresApproval: override?.requiresApproval ?? platform.requiresApproval,
      overReceiptPolicy: override?.overReceiptPolicy ?? platform.overReceiptPolicy,
    };
  }
}

export function createInventoryOperationControlRepository() {
  return new InventoryOperationControlRepository();
}
