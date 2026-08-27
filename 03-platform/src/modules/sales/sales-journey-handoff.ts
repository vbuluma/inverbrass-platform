/**
 * Purpose:
 * Carry a prepared commercial result into the New Sale journey without recalculating.
 */

import type {
  CommercialSnapshot,
  CommercialTransactionContract,
  ExpectedCommercialAmount,
} from "@/modules/commercial";

export const COMMERCIAL_SALE_HANDOFF_STORAGE_KEY =
  "inverbrass.commercial-sale-handoff.v1";

export type CommercialSaleHandoffPayload = {
  version: 1;
  createdAt: string;
  partyId: string;
  crmId: string | null;
  customerName: string | null;
  offeringId: string;
  offeringName: string | null;
  quantity: number;
  currencyCode: string;
  snapshot: CommercialSnapshot;
  expected: ExpectedCommercialAmount;
  contract: CommercialTransactionContract;
};

export function buildCommercialSaleHandoff(
  input: Omit<CommercialSaleHandoffPayload, "version" | "createdAt">
): CommercialSaleHandoffPayload {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

export function saveCommercialSaleHandoff(payload: CommercialSaleHandoffPayload): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      COMMERCIAL_SALE_HANDOFF_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Storage may be unavailable.
  }
}

export function readCommercialSaleHandoff(): CommercialSaleHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(COMMERCIAL_SALE_HANDOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CommercialSaleHandoffPayload;
    if (parsed?.version !== 1 || !parsed.snapshot || !parsed.contract || !parsed.partyId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCommercialSaleHandoff(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(COMMERCIAL_SALE_HANDOFF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createSaleHref(params?: {
  partyId?: string | null;
  crmId?: string | null;
  customerName?: string | null;
  offeringId?: string | null;
  offeringName?: string | null;
}): string {
  const query = new URLSearchParams();
  if (params?.partyId) query.set("partyId", params.partyId);
  if (params?.crmId) query.set("crmId", params.crmId);
  if (params?.customerName) query.set("customerName", params.customerName);
  if (params?.offeringId) query.set("offeringId", params.offeringId);
  if (params?.offeringName) query.set("offeringName", params.offeringName);
  const qs = query.toString();
  return qs ? `/sales/new?${qs}` : "/sales/new";
}
