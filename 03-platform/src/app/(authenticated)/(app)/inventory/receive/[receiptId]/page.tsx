import { redirect } from "next/navigation";

import {
  getReceiptAction,
} from "@/modules/inventory/actions/inventory-inbound-actions";
import { listStockItemsAction } from "@/modules/inventory/actions/inventory-actions";
import { ReceiveStockDetail } from "@/modules/inventory/components/receive-stock-detail";

type ReceiveStockDetailPageProps = {
  params: Promise<{ receiptId: string }>;
};

export default async function ReceiveStockDetailPage({ params }: ReceiveStockDetailPageProps) {
  const { receiptId } = await params;
  const [receipt, items] = await Promise.all([
    getReceiptAction(receiptId),
    listStockItemsAction(),
  ]);
  if (!receipt.success) {
    redirect("/inventory/receive");
  }
  return (
    <ReceiveStockDetail
      receipt={receipt.data}
      stockItems={items.success ? items.data : []}
    />
  );
}
