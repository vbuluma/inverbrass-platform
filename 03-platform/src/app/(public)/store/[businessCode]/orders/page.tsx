/**
 * Purpose:
 * SL-CUS-004 — Customer Web My Orders list.
 */

import Link from "next/link";

import { listMyOrdersAction } from "@/core/channel-experience/customer/order-tracking-actions";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";

type Props = {
  params: Promise<{ businessCode: string }>;
};

export default async function MyOrdersPage({ params }: Props) {
  const { businessCode: rawCode } = await params;
  const businessCode = normalizeBusinessCode(rawCode);

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const result = await listMyOrdersAction(businessCode);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
        My orders
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Orders</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Orders placed in this store for your current session.
      </p>

      {!result.ok ? (
        <p className="mt-8 text-sm text-red-700">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No orders yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-neutral-200 border-t border-neutral-200">
          {result.data.map((order) => (
            <li
              key={order.orderReference}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <p className="font-medium">{order.orderReference}</p>
                <p className="text-xs text-neutral-500">
                  {order.orderStatusCode} · {order.paymentStatusCode}
                </p>
                <p className="mt-1 text-sm">
                  {order.currencyCode} {order.totalAmount}
                </p>
              </div>
              <Link
                href={`/store/${businessCode}/orders/${encodeURIComponent(order.orderReference)}`}
                className="text-sm underline"
              >
                View
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/store/${businessCode}`}
        className="mt-8 inline-block text-sm underline"
      >
        Back to store
      </Link>
    </main>
  );
}
