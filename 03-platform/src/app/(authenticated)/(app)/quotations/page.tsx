import { redirect } from "next/navigation";

import { getQuotationDashboardAction } from "@/modules/crm/actions/quotation-actions";
import { CrmModuleErrorPage } from "@/modules/crm/components/crm-module-error-page";
import { QuotationDashboard } from "@/modules/crm/components/quotation-dashboard";

export default async function QuotationsPage() {
  const result = await getQuotationDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return <CrmModuleErrorPage message={result.error.message} />;
  }

  return <QuotationDashboard data={result.data} />;
}
