import { redirect } from "next/navigation";

import {
  getInventoryDashboardAction,
  listStockItemsAction,
} from "@/modules/inventory/actions/inventory-actions";
import { TransferCreateForm } from "@/modules/inventory/components/transfer-create-form";

export default async function NewInventoryTransferPage() {
  const [dashboard, items] = await Promise.all([
    getInventoryDashboardAction(),
    listStockItemsAction(),
  ]);
  if (!dashboard.success) {
    redirect("/inventory");
  }
  return (
    <TransferCreateForm
      stockItems={items.success ? items.data : []}
      locations={dashboard.data.locations}
    />
  );
}
