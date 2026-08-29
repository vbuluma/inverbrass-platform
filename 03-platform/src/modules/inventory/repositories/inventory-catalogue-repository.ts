/**
 * Purpose:
 * Load platform inventory type catalogues.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryLocationType } from "@/db/schema/inventory-location-type";
import { stockItemType } from "@/db/schema/stock-item-type";
import type { InventoryTypeCataloguePort } from "@/modules/inventory/ports";
import type { CatalogueTypeRef } from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapType(row: {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}): CatalogueTypeRef {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
  };
}

export class InventoryCatalogueRepository implements InventoryTypeCataloguePort {
  constructor(private readonly db: DbClient = getDb()) {}

  async listItemTypes() {
    const rows = await this.db.select().from(stockItemType);
    return rows.map(mapType);
  }

  async findItemType(code: string) {
    const [row] = await this.db
      .select()
      .from(stockItemType)
      .where(eq(stockItemType.code, code))
      .limit(1);
    return row ? mapType(row) : null;
  }

  async listLocationTypes() {
    const rows = await this.db.select().from(inventoryLocationType);
    return rows.map(mapType);
  }

  async findLocationType(code: string) {
    const [row] = await this.db
      .select()
      .from(inventoryLocationType)
      .where(eq(inventoryLocationType.code, code))
      .limit(1);
    return row ? mapType(row) : null;
  }
}

export function createInventoryCatalogueRepository() {
  return new InventoryCatalogueRepository();
}
