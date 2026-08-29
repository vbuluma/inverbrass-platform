import { redirect } from "next/navigation";

import { getInventoryDashboardAction } from "@/modules/inventory/actions/inventory-actions";
import { InventoryLocationPanel } from "@/modules/inventory/components/inventory-location-panel";

export default async function InventoryLocationsPage() {
  const result = await getInventoryDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return (
    <InventoryLocationPanel
      locations={result.data.locations}
      locationTypes={result.data.locationTypes}
    />
  );
}
