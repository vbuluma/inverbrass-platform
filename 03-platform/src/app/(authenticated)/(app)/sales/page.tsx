import { redirect } from "next/navigation";

import { getSalesDashboardAction } from "@/modules/sales/actions/sales-order-actions";
import { SalesDashboard } from "@/modules/sales/components/sales-dashboard";

export default async function SalesPage() {
  const result = await getSalesDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/dashboard");
  }
  return <SalesDashboard data={result.data} />;
}
