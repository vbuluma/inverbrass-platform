import { redirect } from "next/navigation";

import { getInvoiceDetailAction } from "@/modules/payments/actions/payment-invoice-actions";
import { InvoiceDetail } from "@/modules/payments/components/invoice-detail";

type InvoicePageProps = {
  params: Promise<{ invoiceId: string }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceId } = await params;
  const result = await getInvoiceDetailAction(invoiceId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/invoices");
  }
  return <InvoiceDetail data={result.data} />;
}
