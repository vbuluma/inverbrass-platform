import { redirect } from "next/navigation";

import { getLotDetailAction } from "@/modules/inventory/actions/inventory-traceability-actions";
import { LotTraceDetail } from "@/modules/inventory/components/lot-trace-detail";

type LotDetailPageProps = {
  params: Promise<{ lotId: string }>;
};

export default async function InventoryLotDetailPage({ params }: LotDetailPageProps) {
  const { lotId } = await params;
  const result = await getLotDetailAction(lotId);
  if (!result.success) {
    redirect("/inventory/traceability");
  }
  return <LotTraceDetail lot={result.data.lot} history={result.data.history} />;
}
