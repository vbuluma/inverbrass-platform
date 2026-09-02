/**
 * Purpose:
 * CRM hub landing page.
 *
 * NAV-001: CRM is the relationship capability hub. Customer Profile list remains at /customers.
 */

import { redirect } from "next/navigation";

import { getCrmDashboardAction } from "@/modules/crm/actions/crm-actions";
import { CrmHubWorkspace } from "@/modules/crm/components/crm-hub-workspace";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";

export default async function CrmHubPage() {
  const result = await getCrmDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }

    return <CrmModuleErrorPage message={result.error.message} backHref="/crm" backLabel="Back to CRM" />;
  }

  return <CrmHubWorkspace data={result.data} />;
}
