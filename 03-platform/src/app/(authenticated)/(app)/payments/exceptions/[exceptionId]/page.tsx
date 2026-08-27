import { redirect } from "next/navigation";

import { getPaymentExceptionAction } from "@/modules/payments/actions/payment-exception-actions";
import { PaymentExceptionDetail } from "@/modules/payments/components/payment-exception-detail";

type PaymentExceptionPageProps = {
  params: Promise<{ exceptionId: string }>;
};

export default async function PaymentExceptionPage({
  params,
}: PaymentExceptionPageProps) {
  const { exceptionId } = await params;
  const result = await getPaymentExceptionAction(exceptionId);
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/payments/exceptions");
  }
  return <PaymentExceptionDetail data={result.data} />;
}
