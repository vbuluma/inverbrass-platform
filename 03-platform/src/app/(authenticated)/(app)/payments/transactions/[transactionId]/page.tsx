import { redirect } from "next/navigation";

import { listExceptionsForTransactionAction } from "@/modules/payments/actions/payment-exception-actions";
import { getPaymentTransactionAction } from "@/modules/payments/actions/payment-initiation-actions";
import { getReceiptForTransactionAction } from "@/modules/payments/actions/payment-receipt-actions";
import { getRefundEligibilityAction } from "@/modules/payments/actions/payment-refund-actions";
import { getSettlementForTransactionAction } from "@/modules/payments/actions/payment-settlement-actions";
import { PaymentTransactionDetail } from "@/modules/payments/components/payment-transaction-detail";

type PaymentTransactionPageProps = {
  params: Promise<{ transactionId: string }>;
};

export default async function PaymentTransactionPage({
  params,
}: PaymentTransactionPageProps) {
  const { transactionId } = await params;
  const [result, receipt, refunds, settlement, exceptions] = await Promise.all([
    getPaymentTransactionAction(transactionId),
    getReceiptForTransactionAction(transactionId),
    getRefundEligibilityAction(transactionId),
    getSettlementForTransactionAction(transactionId),
    listExceptionsForTransactionAction(transactionId),
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
    <PaymentTransactionDetail
      data={result.data}
      receipt={receipt.success ? receipt.data : null}
      refunds={refunds.success ? refunds.data : null}
      settlement={settlement.success ? settlement.data : null}
      exceptions={exceptions.success ? exceptions.data : []}
    />
  );
}
