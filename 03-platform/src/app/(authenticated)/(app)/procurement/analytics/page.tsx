import { redirect } from "next/navigation";

import { getProcurementAnalyticsDashboardAction } from "@/modules/procurement/actions/procurement-analytics-actions";
import { ProcurementAnalyticsDashboard } from "@/modules/procurement/components/procurement-analytics-dashboard";

export default async function ProcurementAnalyticsPage() {
  const result = await getProcurementAnalyticsDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement");
  }
  return <ProcurementAnalyticsDashboard data={result.data} />;
}
