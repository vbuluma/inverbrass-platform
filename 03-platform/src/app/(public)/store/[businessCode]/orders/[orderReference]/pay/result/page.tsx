/**
 * Purpose:
 * SL-CUS-005 — Payment result confirmation (no VIEW_RECEIPT / history).
 */

import Link from "next/link";

import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";

type Props = {
  params: Promise<{ businessCode: string; orderReference: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function PayResultPage({ params, searchParams }: Props) {
  const { businessCode: rawCode, orderReference: rawRef } = await params;
  const query = await searchParams;
  const businessCode = normalizeBusinessCode(rawCode);
  const orderReference = decodeURIComponent(rawRef);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const paymentReference = first(query.ref);
  const status = first(query.status);
  const paid = first(query.paid);
  const outstanding = first(query.outstanding);
  const currency = first(query.currency);
  const receiptAvailable = first(query.receipt) === "1";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        Payment
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Payment result</h1>
      <p className="mt-2 text-sm text-neutral-600">Order {orderReference}</p>

      <dl className="mt-8 space-y-1 border-t border-neutral-200 pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-neutral-500">Status</dt>
          <dd>{status || "UNKNOWN"}</dd>
        </div>
        {paymentReference ? (
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Payment ref</dt>
            <dd>{paymentReference}</dd>
          </div>
        ) : null}
        {paid ? (
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Amount paid now</dt>
            <dd>
              {currency} {paid}
            </dd>
          </div>
        ) : null}
        {outstanding ? (
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Remaining outstanding</dt>
            <dd>
              {currency} {outstanding}
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-4 text-sm text-neutral-600">
        {receiptAvailable
          ? "Receipt evidence is available for this payment."
          : "Receipt evidence is not available yet."}
      </p>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/store/${businessCode}/orders/${encodeURIComponent(orderReference)}`}
          className="underline"
        >
          View updated payment status
        </Link>
        {Number(outstanding) > 0 ? (
          <Link
            href={`/store/${businessCode}/orders/${encodeURIComponent(orderReference)}/pay`}
            className="underline"
          >
            Pay remaining balance
          </Link>
        ) : null}
        <Link href={`/store/${businessCode}/orders`} className="underline">
          My Orders
        </Link>
      </div>
    </main>
  );
}
