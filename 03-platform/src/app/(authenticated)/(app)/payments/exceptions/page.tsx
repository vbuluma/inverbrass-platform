import { redirect } from "next/navigation";

import { getExceptionDashboardAction } from "@/modules/payments/actions/payment-exception-actions";
import { PaymentExceptionsWorkspace } from "@/modules/payments/components/payment-exceptions-workspace";

type PaymentExceptionsPageProps = {
  searchParams: Promise<{ view?: string }>;
};

export default async function PaymentExceptionsPage({
  searchParams,
}: PaymentExceptionsPageProps) {
  const { view } = await searchParams;
  const result = await getExceptionDashboardAction();
  if (!result.success) {
    if (
      result.error.code === "SESSION_REQUIRED" ||
      result.error.code === "BUSINESS_CONTEXT_REQUIRED"
    ) {
      redirect("/select-business");
    }
    redirect("/payments");
  }
  return <PaymentExceptionsWorkspace data={result.data} view={view || "open"} />;
}
