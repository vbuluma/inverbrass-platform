/**
 * Purpose:
 * Read-only lookup of a BP-008 replenishment advice as a purchase-request origin.
 * Does not write inventory and does not create a PO.
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { inventoryReplenishmentAdvice } from "@/db/schema/inventory-replenishment-advice";
import { stockItem } from "@/db/schema/stock-item";
import type { InventoryReorderOriginPort } from "@/modules/procurement/ports";

export class InventoryReorderOriginAdapter implements InventoryReorderOriginPort {
  constructor(private readonly db = getDb()) {}

  async find(businessId: string, reference: string) {
    const trimmed = reference.trim();
    if (!trimmed) {
      return null;
    }
    const rows = await this.db
      .select({
        id: inventoryReplenishmentAdvice.id,
        adviceNumber: inventoryReplenishmentAdvice.adviceNumber,
        recommendedQuantity: inventoryReplenishmentAdvice.recommendedQuantity,
        sku: stockItem.sku,
      })
      .from(inventoryReplenishmentAdvice)
      .innerJoin(stockItem, eq(stockItem.id, inventoryReplenishmentAdvice.stockItemId))
      .where(
        and(
          eq(inventoryReplenishmentAdvice.businessId, businessId),
          trimmed.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          )
            ? eq(inventoryReplenishmentAdvice.id, trimmed)
            : eq(inventoryReplenishmentAdvice.adviceNumber, trimmed)
        )
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      reference: row.adviceNumber,
      description: row.sku || "Reorder item",
      recommendedQuantity: row.recommendedQuantity,
    };
  }
}

export function createInventoryReorderOriginAdapter() {
  return new InventoryReorderOriginAdapter();
}
