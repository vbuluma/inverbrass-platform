/**
 * Purpose:
 * SL-CUS-001 — Purchase result / receipt evidence page.
 */

import Link from "next/link";

import { getPurchaseByReferenceAction } from "@/core/channel-experience/customer/commerce-actions";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";

type Props = {
  params: Promise<{ businessCode: string; orderReference: string }>;
};

export default async function PurchaseResultPage({ params }: Props) {
  const { businessCode: rawCode, orderReference: rawRef } = await params;
  const businessCode = normalizeBusinessCode(rawCode);
  const orderReference = decodeURIComponent(rawRef);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const purchase = await getPurchaseByReferenceAction(businessCode, orderReference);

  if (!purchase.ok) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Purchase unavailable</h1>
        <p className="mt-2 text-sm text-neutral-600">{purchase.message}</p>
      </main>
    );
  }

  const data = purchase.data;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        Purchase confirmation
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Thank you</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Order {data.orderReference} · {data.paymentStatusCode}
      </p>
      <div className="mt-8 rounded-md border border-neutral-200 p-4 text-sm">
        <p>
          Total: {data.currencyCode} {data.totalAmount}
        </p>
        {data.paymentReference ? (
          <p className="mt-1">Payment ref: {data.paymentReference}</p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {data.lines.map((line) => (
            <li key={`${line.offeringCode}-${line.quantity}`}>
              {line.name} × {line.quantity} — {line.currencyCode} {line.lineAmount}
            </li>
          ))}
        </ul>
        {data.receiptAvailable ? (
          <p className="mt-4 text-neutral-600">Receipt evidence is available for this purchase.</p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/store/${businessCode}/orders/${encodeURIComponent(data.orderReference)}`}
          className="underline"
        >
          View order
        </Link>
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
