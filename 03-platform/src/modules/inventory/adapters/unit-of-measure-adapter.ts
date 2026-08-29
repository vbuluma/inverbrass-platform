/**
 * Purpose:
 * Reuse BP-003 unit of measure catalogue. Does not create a second UOM master.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { UNIT_STATUS_CODES } from "@/modules/product/constants";
import { UnitRepository } from "@/modules/product/repositories/unit-repository";
import type { InventoryUnitCataloguePort } from "@/modules/inventory/ports";
import type { InventoryUnitRef } from "@/modules/inventory/types";

function mapUnit(row: {
  id: string;
  businessId: string;
  code: string;
  name: string;
  symbol: string;
  status: string;
}): InventoryUnitRef {
  return {
    id: row.id,
    businessId: row.businessId,
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    status: row.status,
  };
}

export class UnitOfMeasureAdapter implements InventoryUnitCataloguePort {
  constructor(private readonly units = new UnitRepository()) {}

  async findById(businessId: string, unitId: string) {
    const row = await this.units.findById(businessId, unitId);
    return row ? mapUnit(row) : null;
  }

  async listActive(businessId: string) {
    const rows = await this.units.search(businessId, { status: UNIT_STATUS_CODES.ACTIVE });
    return rows.map((row) => mapUnit(row.unit));
  }
}

export function createUnitOfMeasureAdapter() {
  return new UnitOfMeasureAdapter();
}
