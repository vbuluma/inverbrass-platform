import { redirect } from "next/navigation";

import { getPaymentObligationDetailAction } from "@/modules/payments/actions/payment-initiation-actions";
import { getInvoicesForObligationAction } from "@/modules/payments/actions/payment-invoice-actions";
import { PaymentObligationPanel } from "@/modules/payments/components/payment-obligation-panel";

type PaymentObligationPageProps = {
  params: Promise<{ obligationId: string }>;
};

export default async function PaymentObligationPage({
  params,
}: PaymentObligationPageProps) {
  const { obligationId } = await params;
  const [result, invoices] = await Promise.all([
    getPaymentObligationDetailAction(obligationId),
    getInvoicesForObligationAction(obligationId),
  ]);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/payments");
  }
  return (
    <PaymentObligationPanel
      data={result.data}
      invoices={invoices.success ? invoices.data.invoices : []}
      paymentTerms={invoices.success ? invoices.data.paymentTerms : []}
    />
  );
}
