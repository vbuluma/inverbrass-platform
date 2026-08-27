import { redirect } from "next/navigation";

import { getPaymentsDashboardAction } from "@/modules/payments/actions/payment-obligation-actions";
import { PaymentsWorkspace } from "@/modules/payments/components/payments-workspace";

export default async function PaymentsPage() {
  const result = await getPaymentsDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/dashboard");
  }
  return <PaymentsWorkspace data={result.data} />;
}
