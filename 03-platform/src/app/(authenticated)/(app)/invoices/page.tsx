import { redirect } from "next/navigation";

import { getInvoiceDashboardAction } from "@/modules/payments/actions/payment-invoice-actions";
import { InvoicesWorkspace } from "@/modules/payments/components/invoices-workspace";

export default async function InvoicesPage() {
  const result = await getInvoiceDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/dashboard");
  }
  return <InvoicesWorkspace data={result.data} />;
}
