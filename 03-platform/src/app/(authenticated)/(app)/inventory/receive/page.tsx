import { redirect } from "next/navigation";

import { listReceiptsAction } from "@/modules/inventory/actions/inventory-inbound-actions";
import { ReceiveStockList } from "@/modules/inventory/components/receive-stock-list";

export default async function ReceiveStockPage() {
  const result = await listReceiptsAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <ReceiveStockList receipts={result.data} />;
}
