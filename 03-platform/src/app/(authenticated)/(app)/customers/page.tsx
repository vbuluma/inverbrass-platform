/**
 * Purpose:
 * Customers Dashboard page.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

import { redirect } from "next/navigation";

import { getCrmDashboardAction } from "@/modules/crm/actions/crm-actions";
import { CrmDashboard } from "@/modules/crm/components/crm-dashboard";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

export default async function CustomersPage() {
  const result = await getCrmDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <CrmDashboard data={result.data} />;
}
