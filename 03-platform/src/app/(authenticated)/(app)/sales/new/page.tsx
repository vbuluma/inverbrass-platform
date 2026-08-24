import { CreateSaleWizard } from "@/modules/sales/components/create-sale-wizard";

type PageProps = {
  searchParams: Promise<{
    partyId?: string;
    crmId?: string;
    customerName?: string;
    offeringId?: string;
    offeringName?: string;
  }>;
};

export default async function NewSalePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <CreateSaleWizard
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
