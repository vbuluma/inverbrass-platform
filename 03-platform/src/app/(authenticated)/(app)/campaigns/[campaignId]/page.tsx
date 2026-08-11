import { redirect } from "next/navigation";

import { getCampaignAction } from "@/modules/crm/actions/campaign-actions";
import { CampaignWorkspace } from "@/modules/crm/components/campaign-workspace";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

type PageProps = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function CampaignWorkspacePage({
  params,
  searchParams,
}: PageProps) {
  const { campaignId } = await params;
  const { tab } = await searchParams;
  const result = await getCampaignAction(campaignId);

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage title="Campaigns" backHref="/campaigns" backLabel="Back to Campaigns" message={result.error.message} />;
  }

  return <CampaignWorkspace initialData={result.data} initialTab={tab} />;
}
