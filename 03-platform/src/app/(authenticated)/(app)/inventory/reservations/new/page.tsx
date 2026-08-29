import { redirect } from "next/navigation";

import {
  getInventoryDashboardAction,
  listStockItemsAction,
} from "@/modules/inventory/actions/inventory-actions";
import { ReservationCreateForm } from "@/modules/inventory/components/reservation-create-form";

export default async function NewInventoryReservationPage() {
  const [dashboard, items] = await Promise.all([
    getInventoryDashboardAction(),
    listStockItemsAction(),
  ]);
  if (!dashboard.success) {
    redirect("/inventory");
  }
  return (
    <ReservationCreateForm
      stockItems={items.success ? items.data : []}
      locations={dashboard.data.locations}
    />
  );
}
