import { redirect } from "next/navigation";

import { getCrmGovernanceDashboardAction } from "@/modules/crm-governance/actions/crm-governance-actions";
import { CrmGovernanceDashboard } from "@/modules/crm-governance/components/crm-governance-dashboard";

export default async function CrmGovernancePage() {
  const result = await getCrmGovernanceDashboardAction();

  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-xl font-semibold">CRM Governance</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {result.error.message}
        </p>
      </main>
    );
  }

  return <CrmGovernanceDashboard data={result.data} />;
}
