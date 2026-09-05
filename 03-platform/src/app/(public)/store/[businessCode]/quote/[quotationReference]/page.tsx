/**
 * Purpose:
 * SL-CUS-003 — Quotation request status / confirmation page.
 */

import Link from "next/link";

import { getQuotationStatusAction } from "@/core/channel-experience/customer/quotation-actions";
import {
  isValidBusinessCodeFormat,
  normalizeBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import { StoreSessionBootstrap } from "../../store-session-bootstrap";

type Props = {
  params: Promise<{ businessCode: string; quotationReference: string }>;
};

export default async function QuotationStatusPage({ params }: Props) {
  const { businessCode: rawCode, quotationReference: rawRef } = await params;
  const businessCode = normalizeBusinessCode(rawCode);
  const quotationReference = decodeURIComponent(rawRef).trim();

  if (!isValidBusinessCodeFormat(businessCode)) {
    return <main className="p-8">Store not found</main>;
  }

  const result = await getQuotationStatusAction(businessCode, quotationReference);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <StoreSessionBootstrap businessCode={businessCode} />
      <Link href={`/store/${businessCode}`} className="text-sm underline">
        Back to store
      </Link>

      {!result.ok ? (
        <>
          <h1 className="mt-4 text-2xl font-semibold">Quotation not available</h1>
          <p className="mt-2 text-sm text-neutral-600">{result.message}</p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-3xl font-semibold">Quotation request</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Reference{" "}
            <span className="font-medium text-neutral-900">
              {result.data.quotationReference}
            </span>
          </p>

          <dl className="mt-8 space-y-3 border-t border-neutral-200 pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Status</dt>
              <dd className="font-medium">
                {result.data.statusLabel.replaceAll("_", " ")}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Total</dt>
              <dd className="font-medium">
                {result.data.currencyCode} {result.data.grandTotal}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Submitted</dt>
              <dd>{new Date(result.data.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-neutral-500">Document</dt>
              <dd>
                {result.data.documentAvailable
                  ? "Available"
                  : "Not yet available"}
              </dd>
            </div>
          </dl>

          <ul className="mt-8 divide-y divide-neutral-200 border-t border-neutral-200">
            {result.data.lines.map((line) => (
              <li
                key={`${line.offeringCode}-${line.quantity}`}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{line.name}</p>
                  <p className="text-xs text-neutral-500">
                    {line.offeringCode} · Qty {line.quantity}
                  </p>
                </div>
                <p>
                  {result.data.currencyCode} {line.lineTotal}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
