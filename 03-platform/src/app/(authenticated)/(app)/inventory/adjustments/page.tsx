import { redirect } from "next/navigation";

import { listAdjustmentsAction } from "@/modules/inventory/actions/inventory-adjustment-actions";
import { AdjustmentList } from "@/modules/inventory/components/adjustment-list";

export default async function InventoryAdjustmentsPage() {
  const result = await listAdjustmentsAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <AdjustmentList adjustments={result.data} />;
}
