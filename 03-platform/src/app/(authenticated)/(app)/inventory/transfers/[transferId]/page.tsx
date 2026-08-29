import { redirect } from "next/navigation";

import { getTransferAction } from "@/modules/inventory/actions/inventory-transfer-actions";
import { TransferDetail } from "@/modules/inventory/components/transfer-detail";

type TransferDetailPageProps = {
  params: Promise<{ transferId: string }>;
};

export default async function InventoryTransferDetailPage({ params }: TransferDetailPageProps) {
  const { transferId } = await params;
  const result = await getTransferAction(transferId);
  if (!result.success) {
    redirect("/inventory/transfers");
  }
  return <TransferDetail transfer={result.data} />;
}
