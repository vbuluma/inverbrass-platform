import { redirect } from "next/navigation";

import { getReceiptDetailAction } from "@/modules/payments/actions/payment-receipt-actions";
import { ReceiptDetail } from "@/modules/payments/components/receipt-detail";

type ReceiptPageProps = {
  params: Promise<{ receiptId: string }>;
};

export default async function ReceiptPage({ params }: ReceiptPageProps) {
  const { receiptId } = await params;
  const result = await getReceiptDetailAction(receiptId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/receipts");
  }
  return <ReceiptDetail data={result.data} />;
}
