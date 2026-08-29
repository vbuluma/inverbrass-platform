/**
 * Purpose:
 * Persist foundational inventory balances derived from movements.
 * No public direct-edit API is exposed by the service layer.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  applyInboundQuantity,
  applyOutboundQuantity,
  deriveAvailableQuantity,
  openingStockBalance,
} from "@/core/inventory-engine";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryBalance } from "@/db/schema/inventory-balance";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InventoryBalanceRepositoryPort } from "@/modules/inventory/ports";
import type {
  InventoryBalanceInsert,
  InventoryBalanceRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof inventoryBalance.$inferSelect): InventoryBalanceRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    onHand: String(row.onHand),
    reserved: String(row.reserved),
    available: String(row.available),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

export class InventoryBalanceRepository implements InventoryBalanceRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryBalanceInsert): Promise<InventoryBalanceRecord> {
    try {
      const [row] = await this.db
        .insert(inventoryBalance)
        .values({
          id: values.id,
          businessId: values.businessId,
          stockItemId: values.stockItemId,
          locationId: values.locationId,
          onHand: values.onHand,
          reserved: values.reserved,
          available: values.available,
          metadata: values.metadata,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("inventory_balance_item_location_uidx")) {
        throw new InventoryError(
          INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async applyInboundOnHand(
    businessId: string,
    stockItemId: string,
    locationId: string,
    inboundQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.findByItemAndLocation(businessId, stockItemId, locationId);
    if (!existing) {
      const derived = openingStockBalance(inboundQuantity);
      try {
        return await this.insert({
          businessId,
          stockItemId,
          locationId,
          onHand: derived.onHand,
          reserved: derived.reserved,
          available: derived.available,
          metadata: null,
          createdBy: actorId,
          updatedBy: actorId,
        });
      } catch (error) {
        if (
          error instanceof InventoryError &&
          error.code === INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED
        ) {
          return this.applyInboundOnHand(
            businessId,
            stockItemId,
            locationId,
            inboundQuantity,
            actorId
          );
        }
        throw error;
      }
    }

    const nextOnHand = applyInboundQuantity(existing.onHand, inboundQuantity);
    const nextAvailable = deriveAvailableQuantity(nextOnHand, existing.reserved);
    const [row] = await this.db
      .update(inventoryBalance)
      .set({
        onHand: nextOnHand,
        available: nextAvailable,
        updatedBy: actorId,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(
        and(
          eq(inventoryBalance.id, existing.id),
          eq(inventoryBalance.businessId, businessId),
          eq(inventoryBalance.version, existing.version)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.CONCURRENT_UPDATE, undefined, 409);
    }
    return mapRow(row);
  }

  async applyReservationHold(
    businessId: string,
    stockItemId: string,
    locationId: string,
    reservedDelta: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.requireBalance(businessId, stockItemId, locationId);
    const nextReserved = applyInboundQuantity(existing.reserved, reservedDelta);
    const nextAvailable = deriveAvailableQuantity(existing.onHand, nextReserved);
    return this.updateBalanceSnapshot(existing, {
      reserved: nextReserved,
      available: nextAvailable,
      actorId,
    });
  }

  async applySaleDeduction(
    businessId: string,
    stockItemId: string,
    locationId: string,
    deductedQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.requireBalance(businessId, stockItemId, locationId);
    const nextOnHand = applyOutboundQuantity(existing.onHand, deductedQuantity);
    const nextReserved = applyOutboundQuantity(existing.reserved, deductedQuantity);
    const nextAvailable = deriveAvailableQuantity(nextOnHand, nextReserved);
    return this.updateBalanceSnapshot(existing, {
      onHand: nextOnHand,
      reserved: nextReserved,
      available: nextAvailable,
      actorId,
    });
  }

  async applyOutboundOnHand(
    businessId: string,
    stockItemId: string,
    locationId: string,
    outboundQuantity: string,
    actorId: string | null
  ): Promise<InventoryBalanceRecord> {
    const existing = await this.findByItemAndLocation(businessId, stockItemId, locationId);
    if (!existing) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT);
    }
    const nextOnHand = applyOutboundQuantity(existing.onHand, outboundQuantity);
    const nextAvailable = deriveAvailableQuantity(nextOnHand, existing.reserved);
    return this.updateBalanceSnapshot(existing, {
      onHand: nextOnHand,
      available: nextAvailable,
      actorId,
    });
  }

  private async requireBalance(businessId: string, stockItemId: string, locationId: string) {
    const existing = await this.findByItemAndLocation(businessId, stockItemId, locationId);
    if (!existing) {
      throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK);
    }
    return existing;
  }

  private async updateBalanceSnapshot(
    existing: InventoryBalanceRecord,
    patch: {
      onHand?: string;
      reserved?: string;
      available: string;
      actorId: string | null;
    }
  ) {
    const [row] = await this.db
      .update(inventoryBalance)
      .set({
        onHand: patch.onHand ?? existing.onHand,
        reserved: patch.reserved ?? existing.reserved,
        available: patch.available,
        updatedBy: patch.actorId,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(
        and(
          eq(inventoryBalance.id, existing.id),
          eq(inventoryBalance.businessId, existing.businessId),
          eq(inventoryBalance.version, existing.version)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.CONCURRENT_UPDATE, undefined, 409);
    }
    return mapRow(row);
  }

  async findByItemAndLocation(businessId: string, stockItemId: string, locationId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.businessId, businessId),
          eq(inventoryBalance.stockItemId, stockItemId),
          eq(inventoryBalance.locationId, locationId)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByStockItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryBalance)
      .where(
        and(
          eq(inventoryBalance.businessId, businessId),
          eq(inventoryBalance.stockItemId, stockItemId)
        )
      );
    return rows.map(mapRow);
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryBalance)
      .where(eq(inventoryBalance.businessId, businessId));
    return rows.map(mapRow);
  }
}

export function createInventoryBalanceRepository() {
  return new InventoryBalanceRepository();
}
