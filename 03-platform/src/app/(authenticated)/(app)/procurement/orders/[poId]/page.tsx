import { redirect } from "next/navigation";

import { getPurchaseOrderAction } from "@/modules/procurement/actions/purchase-order-actions";
import { getPoFulfilmentAction } from "@/modules/procurement/actions/receiving-actions";
import { PurchaseOrderWorkspace } from "@/modules/procurement/components/purchase-order-workspace";

type PurchaseOrderDetailPageProps = {
  params: Promise<{ poId: string }>;
};

export default async function PurchaseOrderDetailPage({ params }: PurchaseOrderDetailPageProps) {
  const { poId } = await params;
  const result = await getPurchaseOrderAction(poId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/orders");
  }
  const fulfilmentResult = await getPoFulfilmentAction(poId);
  return (
    <PurchaseOrderWorkspace
      order={result.data}
      fulfilment={fulfilmentResult.success ? fulfilmentResult.data : null}
    />
  );
}
