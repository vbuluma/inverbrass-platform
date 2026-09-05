/**
 * Purpose:
 * SL-CUS-004 — Customer Web order hub (order + payment tracking).
 * CRM Case Management is deferred and not wired here.
 */

import Link from "next/link";

import { getOrderHubDetailAction } from "@/core/channel-experience/customer/order-tracking-actions";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";

type Props = {
  params: Promise<{ businessCode: string; orderReference: string }>;
};

export default async function OrderHubPage({ params }: Props) {
  const { businessCode: rawCode, orderReference: rawRef } = await params;
  const businessCode = normalizeBusinessCode(rawCode);
  const orderReference = decodeURIComponent(rawRef);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const result = await getOrderHubDetailAction(businessCode, orderReference);

  if (!result.ok) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Order unavailable</h1>
        <p className="mt-2 text-sm text-neutral-600">{result.message}</p>
        <Link
          href={`/store/${businessCode}/orders`}
          className="mt-6 inline-block text-sm underline"
        >
          Back to My Orders
        </Link>
      </main>
    );
  }

  const order = result.data;
  const payment = order.payment;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        Order
      </p>
      <h1 className="mt-2 text-3xl font-semibold">{order.orderReference}</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {order.orderStatusCode} · {new Date(order.orderDate).toLocaleString()}
      </p>

      <section className="mt-8 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-medium">Items</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.lines.map((line) => (
            <li key={`${line.offeringCode}-${line.quantity}`}>
              {line.name} × {line.quantity} — {line.currencyCode}{" "}
              {line.lineAmount}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm font-medium">
          Total: {order.currencyCode} {order.totalAmount}
        </p>
      </section>

      <section className="mt-8 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-medium">Payment</h2>
        <dl className="mt-3 space-y-1 text-sm">
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
          {payment.paymentReference ? (
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Payment ref</dt>
              <dd>{payment.paymentReference}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-sm text-neutral-600">
          {payment.receiptAvailable
            ? "Receipt evidence is available for this payment."
            : "Receipt evidence is not available yet."}
        </p>
        {Number(payment.outstandingAmount) > 0 ? (
          <Link
            href={`/store/${businessCode}/orders/${encodeURIComponent(order.orderReference)}/pay`}
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            Pay Outstanding
          </Link>
        ) : null}
      </section>

      <section className="mt-8 border-t border-neutral-200 pt-6">
        <h2 className="text-lg font-medium">Need help?</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Case / complaint / follow-up support is coming soon. CRM Case
          Management is deferred to a separately governed slice.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href={`/store/${businessCode}/orders`} className="underline">
          My Orders
        </Link>
        <Link href={`/store/${businessCode}`} className="underline">
          Back to store
        </Link>
      </div>
    </main>
  );
}
