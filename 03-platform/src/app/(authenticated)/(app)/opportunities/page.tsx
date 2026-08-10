import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { getOpportunityDashboardAction } from "@/modules/crm/opportunity/actions/opportunity-actions";
import { OpportunityDashboard } from "@/modules/crm/opportunity/components/opportunity-dashboard";

export default async function OpportunitiesPage() {
  const result = await getOpportunityDashboardAction();

  if (!result.success) {
    if (result.error.code === "INVALID_INPUT") {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <OpportunityDashboard data={result.data} />;
}
