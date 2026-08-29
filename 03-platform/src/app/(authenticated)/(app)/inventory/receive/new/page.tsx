import { redirect } from "next/navigation";

import { getInventoryDashboardAction } from "@/modules/inventory/actions/inventory-actions";
import { listInventorySuppliersAction } from "@/modules/inventory/actions/inventory-inbound-actions";
import { ReceiveStockCreateForm } from "@/modules/inventory/components/receive-stock-create-form";

export default async function NewReceiveStockPage() {
  const dashboard = await getInventoryDashboardAction();
  const suppliers = await listInventorySuppliersAction();
  if (!dashboard.success) {
    redirect("/inventory");
  }
  return (
    <ReceiveStockCreateForm
      locations={dashboard.data.locations}
      suppliers={suppliers.success ? suppliers.data : []}
    />
  );
}
