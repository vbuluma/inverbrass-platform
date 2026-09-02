import { redirect } from "next/navigation";

import { getReceiptAction } from "@/modules/procurement/actions/receiving-actions";
import { ReceivingWorkspace } from "@/modules/procurement/components/receiving-workspace";

type ReceivingDetailPageProps = {
  params: Promise<{ receiptId: string }>;
};

export default async function ReceivingDetailPage({ params }: ReceivingDetailPageProps) {
  const { receiptId } = await params;
  const result = await getReceiptAction(receiptId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/procurement/receiving");
  }
  return <ReceivingWorkspace receipt={result.data} />;
}
