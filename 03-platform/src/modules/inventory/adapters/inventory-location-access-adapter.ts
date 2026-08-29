/**
 * Purpose:
 * Location access policy. A location is operable only when it belongs to
 * the authenticated business. No role names are encoded here.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryLocationAccessPort,
  InventoryLocationRepositoryPort,
} from "@/modules/inventory/ports";
import { createInventoryLocationRepository } from "@/modules/inventory/repositories/inventory-location-repository";

export class BusinessScopedLocationAccess implements InventoryLocationAccessPort {
  constructor(private readonly locations: InventoryLocationRepositoryPort) {}

  async assertCanOperate(context: CurrentBusinessContext, locationId: string) {
    const location = await this.locations.findById(context.businessId, locationId);
    if (!location) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_ACCESS_DENIED, undefined, 403);
    }
    if (!location.isActive) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_INACTIVE);
    }
  }
}

export function createBusinessScopedLocationAccess(
  locations: InventoryLocationRepositoryPort = createInventoryLocationRepository()
) {
  return new BusinessScopedLocationAccess(locations);
}
