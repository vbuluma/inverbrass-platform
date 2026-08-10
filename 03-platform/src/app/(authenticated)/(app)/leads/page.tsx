/**
 * Purpose:
 * Leads Dashboard page.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

import { redirect } from "next/navigation";

import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { getLeadDashboardAction } from "@/modules/crm/lead/actions/lead-actions";
import { LeadDashboard } from "@/modules/crm/lead/components/lead-dashboard";

export default async function LeadsPage() {
  const result = await getLeadDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "INVALID_INPUT"
    ) {
      redirect("/select-business");
    }

    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <LeadDashboard data={result.data} />;
}
