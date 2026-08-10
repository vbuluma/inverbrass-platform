import { redirect } from "next/navigation";

import { getCrmAnalyticsDashboardAction } from "@/modules/crm/actions/crm-analytics-actions";
import { CrmAnalyticsDashboard } from "@/modules/crm/components/crm-analytics-dashboard";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

export default async function CrmAnalyticsPage() {
  const result = await getCrmAnalyticsDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <CrmModuleErrorPage title="CRM Analytics" message={result.error.message} />
    );
  }

  return <CrmAnalyticsDashboard data={result.data} />;
}
