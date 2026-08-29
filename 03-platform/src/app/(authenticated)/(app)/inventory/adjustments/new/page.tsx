import { redirect } from "next/navigation";

import {
  getInventoryDashboardAction,
  listStockItemsAction,
} from "@/modules/inventory/actions/inventory-actions";
import { AdjustmentCreateForm } from "@/modules/inventory/components/adjustment-create-form";

export default async function NewInventoryAdjustmentPage() {
  const [dashboard, items] = await Promise.all([
    getInventoryDashboardAction(),
    listStockItemsAction(),
  ]);
  if (!dashboard.success) {
    redirect("/inventory");
  }
  return (
    <AdjustmentCreateForm
      stockItems={items.success ? items.data : []}
      locations={dashboard.data.locations}
    />
  );
}
