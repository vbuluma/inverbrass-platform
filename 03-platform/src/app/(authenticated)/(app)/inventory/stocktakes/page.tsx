import { redirect } from "next/navigation";

import { listStocktakesAction } from "@/modules/inventory/actions/inventory-stocktake-actions";
import { StocktakeList } from "@/modules/inventory/components/stocktake-list";

export default async function InventoryStocktakesPage() {
  const result = await listStocktakesAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/inventory");
  }
  return <StocktakeList stocktakes={result.data} />;
}
