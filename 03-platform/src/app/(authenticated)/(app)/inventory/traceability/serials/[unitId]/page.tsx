import { redirect } from "next/navigation";

import { getTrackedUnitDetailAction } from "@/modules/inventory/actions/inventory-traceability-actions";
import { UnitTraceDetail } from "@/modules/inventory/components/unit-trace-detail";

type UnitDetailPageProps = {
  params: Promise<{ unitId: string }>;
};

export default async function InventorySerialDetailPage({ params }: UnitDetailPageProps) {
  const { unitId } = await params;
  const result = await getTrackedUnitDetailAction(unitId);
  if (!result.success) {
    redirect("/inventory/traceability");
  }
  return <UnitTraceDetail unit={result.data.unit} history={result.data.history} />;
}
