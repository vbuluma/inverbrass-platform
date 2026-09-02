/**
 * Purpose:
 * Read and assign BP-002 Party supplier role. Does not copy identity.
 */

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { party } from "@/db/schema/party";
import { partyRole } from "@/db/schema/party-role";
import { PARTY_ROLE_STATUS_CODES } from "@/modules/party/constants";
import { createPartyRoleService } from "@/modules/party/services/party-role-service";
import { createPartyService } from "@/modules/party/services/party-service";
import type { ProcurementPartyPort } from "@/modules/procurement/ports";
import type { ProcurementPartyRef } from "@/modules/procurement/types";

export class ProcurementPartyAdapter implements ProcurementPartyPort {
  constructor(
    private readonly partyService = createPartyService(),
    private readonly partyRoleService = createPartyRoleService()
  ) {}

  async findParty(businessId: string, partyId: string): Promise<ProcurementPartyRef | null> {
    const db = getDb();
    const [row] = await db
      .select({
        id: party.id,
        businessId: party.businessId,
        displayName: party.displayName,
        partyNumber: party.partyNumber,
        partyTypeCode: party.partyTypeCode,
      })
      .from(party)
      .where(and(eq(party.businessId, businessId), eq(party.id, partyId)))
      .limit(1);
    if (!row) {
      return null;
    }
    const [role] = await db
      .select({ id: partyRole.id })
      .from(partyRole)
      .where(
        and(
          eq(partyRole.businessId, businessId),
          eq(partyRole.partyId, partyId),
          eq(partyRole.roleTypeCode, "SUPPLIER"),
          eq(partyRole.statusCode, PARTY_ROLE_STATUS_CODES.ACTIVE)
        )
      )
      .limit(1);
    return { ...row, hasActiveSupplierRole: Boolean(role) };
  }

  async searchParties(businessId: string, query: string): Promise<ProcurementPartyRef[]> {
    const rows = await this.partyService.searchParties(
      { businessId, platformUserId: "", businessMembershipId: "" },
      query
    );
    const results: ProcurementPartyRef[] = [];
    for (const row of rows) {
      const found = await this.findParty(businessId, row.id);
      if (found) {
        results.push(found);
      }
    }
    return results;
  }

  async assignSupplierRole(businessId: string, partyId: string, actorUserId: string) {
    await this.partyRoleService.assignRole(
      { businessId, platformUserId: actorUserId, businessMembershipId: "" },
      partyId,
      { roleTypeCode: "SUPPLIER", isPrimary: false }
    );
  }
}

export function createProcurementPartyAdapter() {
  return new ProcurementPartyAdapter();
}
