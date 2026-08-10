/**
 * Default Party lookup adapter — delegates to BP-002 Party repository.
 * BP-004 / IP-05
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { createPartyRepository } from "@/modules/party/repositories/party-repository";
import type {
  CrmActivityPartyLookupPort,
  CrmActivityPartyLookupResult,
} from "@/modules/crm-activity/ports/crm-activity-party-lookup-port";

export function createCrmActivityPartyLookupAdapter(
  context: CurrentBusinessContext
): CrmActivityPartyLookupPort {
  const partyRepository = createPartyRepository();

  return {
    async searchParties(
      query: string,
      limit = 20
    ): Promise<CrmActivityPartyLookupResult[]> {
      const rows = await partyRepository.searchByQuery(
        context.businessId,
        query
      );

      return rows.slice(0, limit).map((row) => ({
        id: row.id,
        partyNumber: row.partyNumber,
        displayName: row.displayName,
        partyTypeCode: row.partyTypeCode,
      }));
    },

    async getPartyById(
      partyId: string
    ): Promise<CrmActivityPartyLookupResult | null> {
      const row = await partyRepository.findByIdIncludingArchived(
        context.businessId,
        partyId
      );

      if (!row) return null;

      return {
        id: row.id,
        partyNumber: row.partyNumber,
        displayName: row.displayName,
        partyTypeCode: row.partyTypeCode,
      };
    },
  };
}
