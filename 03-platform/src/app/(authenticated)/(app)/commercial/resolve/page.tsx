/**
 * Purpose:
 * Commercial pricing workspace — resolve expected commercial amount for a sale.
 */

import { CommercialResolutionWorkspace } from "@/modules/commercial/components/commercial-resolution-workspace";

type PageProps = {
  searchParams: Promise<{
    partyId?: string;
    crmId?: string;
    customerName?: string;
    offeringId?: string;
    offeringName?: string;
  }>;
};

export default async function CommercialResolvePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CommercialResolutionWorkspace
      initialContext={{
        partyId: params.partyId?.trim() || null,
        crmId: params.crmId?.trim() || null,
        customerName: params.customerName?.trim() || null,
        offeringId: params.offeringId?.trim() || null,
        offeringName: params.offeringName?.trim() || null,
      }}
    />
  );
}
