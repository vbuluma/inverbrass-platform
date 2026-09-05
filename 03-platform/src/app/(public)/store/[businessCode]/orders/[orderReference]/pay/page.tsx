/**
 * Purpose:
 * SL-CUS-005 — Pay Outstanding page.
 */

import Link from "next/link";

import { getPayablePaymentStatusAction } from "@/core/channel-experience/customer/payment-actions";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { PayOutstandingForm } from "@/app/(public)/store/[businessCode]/orders/[orderReference]/pay/pay-outstanding-form";

type Props = {
  params: Promise<{ businessCode: string; orderReference: string }>;
};

export default async function PayOutstandingPage({ params }: Props) {
  const { businessCode: rawCode, orderReference: rawRef } = await params;
  const businessCode = normalizeBusinessCode(rawCode);
  const orderReference = decodeURIComponent(rawRef);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const result = await getPayablePaymentStatusAction(
    businessCode,
    orderReference
  );

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Payment unavailable</h1>
        <p className="mt-2 text-sm text-neutral-600">{result.message}</p>
        <Link
          href={`/store/${businessCode}/orders/${encodeURIComponent(orderReference)}`}
          className="mt-6 inline-block text-sm underline"
        >
          Back to order
        </Link>
      </main>
    );
  }

  const payment = result.data;
  const outstanding = Number(payment.outstandingAmount);
  const canPay = Number.isFinite(outstanding) && outstanding > 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        Payment
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Pay Outstanding</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Order {payment.orderReference}
      </p>

      <section className="mt-8 border-t border-neutral-200 pt-6">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Status</dt>
            <dd>{payment.paymentStatusCode}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Amount due</dt>
            <dd>
              {payment.currencyCode} {payment.amountDue}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Amount paid</dt>
            <dd>
              {payment.currencyCode} {payment.amountPaid}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Outstanding</dt>
            <dd>
              {payment.currencyCode} {payment.outstandingAmount}
            </dd>
          </div>
        </dl>
      </section>

      {canPay ? (
        <PayOutstandingForm
          businessCode={businessCode}
          orderReference={orderReference}
          currencyCode={payment.currencyCode}
          outstandingAmount={payment.outstandingAmount}
        />
      ) : (
        <p className="mt-6 text-sm text-neutral-600">
          This order is already fully paid.
        </p>
      )}

      <div className="mt-8 text-sm">
        <Link
          href={`/store/${businessCode}/orders/${encodeURIComponent(orderReference)}`}
          className="underline"
        >
          Back to order
        </Link>
      </div>
    </main>
  );
}
