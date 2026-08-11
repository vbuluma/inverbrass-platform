import { redirect } from "next/navigation";

import { getCampaignDashboardAction } from "@/modules/crm/actions/campaign-actions";
import { CampaignDashboard } from "@/modules/crm/components/campaign-dashboard";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

export default async function CampaignsPage() {
  const result = await getCampaignDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage title="Campaigns" backHref="/campaigns" backLabel="Back to Campaigns" message={result.error.message} />;
  }

  return <CampaignDashboard data={result.data} />;
}
