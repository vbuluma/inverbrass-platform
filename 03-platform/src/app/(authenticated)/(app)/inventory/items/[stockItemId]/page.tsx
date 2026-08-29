import { redirect } from "next/navigation";

import {
  getInventoryDashboardAction,
  getStockItemAction,
} from "@/modules/inventory/actions/inventory-actions";
import { StockItemDetail } from "@/modules/inventory/components/stock-item-detail";

export default async function StockItemDetailPage({
  params,
}: {
  params: Promise<{ stockItemId: string }>;
}) {
  const { stockItemId } = await params;
  const [itemResult, dashboard] = await Promise.all([
    getStockItemAction(stockItemId),
    getInventoryDashboardAction(),
  ]);
  if (!itemResult.success) {
    if (
      itemResult.error.code === "SESSION_REQUIRED" ||
      itemResult.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return (
    <StockItemDetail
      item={itemResult.data}
      locations={dashboard.success ? dashboard.data.locations : []}
    />
  );
}
