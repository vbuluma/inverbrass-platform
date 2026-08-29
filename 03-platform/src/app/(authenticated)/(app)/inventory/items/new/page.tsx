import { redirect } from "next/navigation";

import { getInventoryDashboardAction } from "@/modules/inventory/actions/inventory-actions";
import { StockItemCreateForm } from "@/modules/inventory/components/stock-item-create-form";

export default async function NewStockItemPage() {
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
    <StockItemCreateForm
      products={result.data.products}
      units={result.data.units}
      itemTypes={result.data.itemTypes}
    />
  );
}
