import { redirect } from "next/navigation";

import { getInventoryDashboardAction } from "@/modules/inventory/actions/inventory-actions";
import { OpeningBalanceCreateForm } from "@/modules/inventory/components/opening-balance-create-form";

export default async function NewOpeningBalancePage() {
  const dashboard = await getInventoryDashboardAction();
  if (!dashboard.success) {
    redirect("/inventory");
  }
  return <OpeningBalanceCreateForm locations={dashboard.data.locations} />;
}
