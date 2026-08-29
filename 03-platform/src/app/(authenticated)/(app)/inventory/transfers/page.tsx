import { redirect } from "next/navigation";

import { listTransfersAction } from "@/modules/inventory/actions/inventory-transfer-actions";
import { TransferList } from "@/modules/inventory/components/transfer-list";

export default async function InventoryTransfersPage() {
  const result = await listTransfersAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <TransferList transfers={result.data} />;
}
