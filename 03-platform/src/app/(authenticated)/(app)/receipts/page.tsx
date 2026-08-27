import { redirect } from "next/navigation";

import { getReceiptDashboardAction } from "@/modules/payments/actions/payment-receipt-actions";
import { ReceiptsWorkspace } from "@/modules/payments/components/receipts-workspace";

export default async function ReceiptsPage() {
  const result = await getReceiptDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/dashboard");
  }
  return <ReceiptsWorkspace data={result.data} />;
}
