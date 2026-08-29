import { redirect } from "next/navigation";

import { getStocktakeAction } from "@/modules/inventory/actions/inventory-stocktake-actions";
import { StocktakeDetail } from "@/modules/inventory/components/stocktake-detail";

type StocktakeDetailPageProps = {
  params: Promise<{ stocktakeId: string }>;
};

export default async function InventoryStocktakeDetailPage({
  params,
}: StocktakeDetailPageProps) {
  const { stocktakeId } = await params;
  const result = await getStocktakeAction(stocktakeId);
  if (!result.success) {
    redirect("/inventory/stocktakes");
  }
  return <StocktakeDetail stocktake={result.data} />;
}
