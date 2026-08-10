import { redirect } from "next/navigation";

import { getCrmPartyGovernancePanelAction } from "@/modules/crm-governance/actions/crm-governance-actions";
import { CrmGovernancePanel } from "@/modules/crm-governance/components/crm-governance-panel";

type PageProps = {
  params: Promise<{ partyId: string }>;
};

export default async function CrmPartyGovernancePage({ params }: PageProps) {
  const { partyId } = await params;
  const result = await getCrmPartyGovernancePanelAction(partyId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">Party governance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return <CrmGovernancePanel partyId={partyId} initialData={result.data} />;
}
