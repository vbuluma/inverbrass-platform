/**
 * Purpose:
 * Persist inventory locations with tenant isolation.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryLocation } from "@/db/schema/inventory-location";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InventoryLocationRepositoryPort } from "@/modules/inventory/ports";
import type {
  InventoryLocationInsert,
  InventoryLocationPatch,
  InventoryLocationRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof inventoryLocation.$inferSelect): InventoryLocationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    code: row.code,
    name: row.name,
    description: row.description,
    locationTypeCode: row.locationTypeCode,
    parentLocationId: row.parentLocationId,
    isActive: row.isActive,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    version: row.version,
  };
}

export class InventoryLocationRepository implements InventoryLocationRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryLocationInsert): Promise<InventoryLocationRecord> {
    try {
      const [row] = await this.db
        .insert(inventoryLocation)
        .values({
          id: values.id,
          businessId: values.businessId,
          code: values.code,
          name: values.name,
          description: values.description,
          locationTypeCode: values.locationTypeCode,
          parentLocationId: values.parentLocationId,
          isActive: values.isActive,
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
      if (message.includes("inventory_location_business_code_uidx")) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_LOCATION_CODE, undefined, 409);
      }
      throw error;
    }
  }

  async update(businessId: string, locationId: string, patch: InventoryLocationPatch) {
    const [row] = await this.db
      .update(inventoryLocation)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryLocation.businessId, businessId),
          eq(inventoryLocation.id, locationId),
          isNull(inventoryLocation.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_NOT_FOUND, undefined, 404);
    }
    return mapRow(row);
  }

  async findById(businessId: string, locationId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryLocation)
      .where(
        and(
          eq(inventoryLocation.businessId, businessId),
          eq(inventoryLocation.id, locationId),
          isNull(inventoryLocation.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByCode(businessId: string, code: string) {
    const [row] = await this.db
      .select()
      .from(inventoryLocation)
      .where(
        and(
          eq(inventoryLocation.businessId, businessId),
          eq(inventoryLocation.code, code),
          isNull(inventoryLocation.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryLocation)
      .where(and(eq(inventoryLocation.businessId, businessId), isNull(inventoryLocation.deletedAt)));
    return rows.map(mapRow);
  }
}

export function createInventoryLocationRepository() {
  return new InventoryLocationRepository();
}
