import { redirect } from "next/navigation";

import { listAvailabilityWithTransitAction } from "@/modules/inventory/actions/inventory-transfer-actions";
import { InventoryAvailabilityList } from "@/modules/inventory/components/inventory-availability-list";

export default async function InventoryAvailabilityPage() {
  const result = await listAvailabilityWithTransitAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <InventoryAvailabilityList rows={result.data} />;
}
