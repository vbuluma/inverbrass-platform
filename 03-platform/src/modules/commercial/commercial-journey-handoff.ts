/**
 * Purpose:
 * Client-side handoff of a validated commercial result into tax obligations.
 * Carries existing snapshot/tax amounts — does not recalculate pricing or tax.
 *
 * Presentation only: removes manual copy/paste of commercial identifiers.
 */

export const COMMERCIAL_TAX_HANDOFF_STORAGE_KEY =
  "inverbrass.commercial-tax-handoff.v1";

export type CommercialTaxHandoffPayload = {
  version: 1;
  createdAt: string;
  snapshotId: string;
  resolutionId: string;
  commercialContractId: string | null;
  taxComponentId: string;
  taxTypeCode: string;
  taxableAmount: string;
  taxAmount: string;
  currencyCode: string;
  obligationDate: string;
  expectedAmount: string;
  offeringName: string | null;
  offeringId: string | null;
  customerName: string | null;
  partyId: string | null;
  crmId: string | null;
};

export function buildCommercialTaxHandoff(
  input: Omit<CommercialTaxHandoffPayload, "version" | "createdAt">
): CommercialTaxHandoffPayload {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    ...input,
  };
}

export function saveCommercialTaxHandoff(
  payload: CommercialTaxHandoffPayload
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(
      COMMERCIAL_TAX_HANDOFF_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Storage may be unavailable — tax screen will show empty-state guidance.
  }
}

export function readCommercialTaxHandoff(): CommercialTaxHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(COMMERCIAL_TAX_HANDOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CommercialTaxHandoffPayload;
    if (parsed?.version !== 1 || !parsed.snapshotId || !parsed.taxAmount) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCommercialTaxHandoff(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(COMMERCIAL_TAX_HANDOFF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function taxComplianceHandoffHref(): string {
  return "/commercial/tax-compliance?handoff=1";
}

export function commercialResolveHref(params?: {
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
  return qs ? `/commercial/resolve?${qs}` : "/commercial/resolve";
}
