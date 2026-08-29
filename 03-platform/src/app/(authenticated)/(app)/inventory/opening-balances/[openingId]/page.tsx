import { redirect } from "next/navigation";

import { listStockItemsAction } from "@/modules/inventory/actions/inventory-actions";
import { getOpeningBalanceAction } from "@/modules/inventory/actions/inventory-inbound-actions";
import { OpeningBalanceDetail } from "@/modules/inventory/components/opening-balance-detail";

type OpeningBalanceDetailPageProps = {
  params: Promise<{ openingId: string }>;
};

export default async function OpeningBalanceDetailPage({
  params,
}: OpeningBalanceDetailPageProps) {
  const { openingId } = await params;
  const [document, items] = await Promise.all([
    getOpeningBalanceAction(openingId),
    listStockItemsAction(),
  ]);
  if (!document.success) {
    redirect("/inventory/opening-balances");
  }
  return (
    <OpeningBalanceDetail
      document={document.data}
      stockItems={items.success ? items.data : []}
    />
  );
}
