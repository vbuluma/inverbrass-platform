import { redirect } from "next/navigation";

import { getProcurementDashboardAction } from "@/modules/procurement/actions/procurement-actions";
import { ProcurementHubWorkspace } from "@/modules/procurement/components/procurement-hub-workspace";

export default async function ProcurementHubPage() {
  const result = await getProcurementDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/dashboard");
  }
  return <ProcurementHubWorkspace data={result.data} />;
}
