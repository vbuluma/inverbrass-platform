import { redirect } from "next/navigation";

import { getPurchaseRequestAction } from "@/modules/procurement/actions/purchase-request-actions";
import { PurchaseRequestWorkspace } from "@/modules/procurement/components/purchase-request-workspace";

type PurchaseRequestDetailPageProps = {
  params: Promise<{ requestId: string }>;
};

export default async function PurchaseRequestDetailPage({
  params,
}: PurchaseRequestDetailPageProps) {
  const { requestId } = await params;
  const result = await getPurchaseRequestAction(requestId);
  if (!result.success) {
    redirect("/procurement/requests");
  }
  return <PurchaseRequestWorkspace request={result.data} />;
}
