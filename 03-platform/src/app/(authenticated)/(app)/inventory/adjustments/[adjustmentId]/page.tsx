import { redirect } from "next/navigation";

import { getAdjustmentAction } from "@/modules/inventory/actions/inventory-adjustment-actions";
import { AdjustmentDetail } from "@/modules/inventory/components/adjustment-detail";

type AdjustmentDetailPageProps = {
  params: Promise<{ adjustmentId: string }>;
};

export default async function InventoryAdjustmentDetailPage({
  params,
}: AdjustmentDetailPageProps) {
  const { adjustmentId } = await params;
  const result = await getAdjustmentAction(adjustmentId);
  if (!result.success) {
    redirect("/inventory/adjustments");
  }
  return <AdjustmentDetail adjustment={result.data} />;
}
