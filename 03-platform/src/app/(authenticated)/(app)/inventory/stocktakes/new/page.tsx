import { redirect } from "next/navigation";

import {
  getInventoryDashboardAction,
  listStockItemsAction,
} from "@/modules/inventory/actions/inventory-actions";
import { StocktakeCreateForm } from "@/modules/inventory/components/stocktake-create-form";

export default async function NewInventoryStocktakePage() {
  const [dashboard, items] = await Promise.all([
    getInventoryDashboardAction(),
    listStockItemsAction(),
  ]);
  if (!dashboard.success) {
    redirect("/inventory");
  }
  return (
    <StocktakeCreateForm
      stockItems={items.success ? items.data : []}
      locations={dashboard.data.locations}
    />
  );
}
