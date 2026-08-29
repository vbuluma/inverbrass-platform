/**
 * Purpose:
 * Read supplier parties via existing Party / Party Role capability.
 * Does not create bills or accounts payable.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { party } from "@/db/schema/party";
import { partyRole } from "@/db/schema/party-role";
import { PARTY_ROLE_STATUS_CODES } from "@/modules/party/constants";
import type { InventorySupplierPort } from "@/modules/inventory/ports";
import type { InventorySupplierRef } from "@/modules/inventory/types";

export class InventorySupplierAdapter implements InventorySupplierPort {
  async findActiveSupplier(businessId: string, partyId: string): Promise<InventorySupplierRef | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .innerJoin(
        partyRole,
        and(eq(partyRole.partyId, party.id), eq(partyRole.businessId, party.businessId))
      )
      .where(
        and(
          eq(party.businessId, businessId),
          eq(party.id, partyId),
          eq(partyRole.roleTypeCode, "SUPPLIER"),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      )
      .limit(1);
    return row ?? null;
  }

  async listActiveSuppliers(businessId: string): Promise<InventorySupplierRef[]> {
    const db = getDb();
    const rows = await db
      .select({
        id: party.id,
        displayName: party.displayName,
      })
      .from(party)
      .innerJoin(
        partyRole,
        and(eq(partyRole.partyId, party.id), eq(partyRole.businessId, party.businessId))
      )
      .where(
        and(
          eq(party.businessId, businessId),
          eq(partyRole.roleTypeCode, "SUPPLIER"),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      );
    return rows;
  }
}

export function createInventorySupplierAdapter() {
  return new InventorySupplierAdapter();
}
