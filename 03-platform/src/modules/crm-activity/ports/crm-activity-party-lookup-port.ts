/**
 * Party lookup port for CRM Activity forms.
 * IP-04 will supply a richer picker; this interface avoids refactoring repositories.
 *
 * BP-004 / IP-05
 */

export type CrmActivityPartyLookupResult = {
  id: string;
  partyNumber: string;
  displayName: string;
  partyTypeCode: string;
};

export type CrmActivityPartyLookupPort = {
  searchParties(query: string, limit?: number): Promise<CrmActivityPartyLookupResult[]>;
  getPartyById(partyId: string): Promise<CrmActivityPartyLookupResult | null>;
};
