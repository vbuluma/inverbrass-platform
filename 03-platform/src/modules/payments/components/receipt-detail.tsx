"use client";

/**
 * Purpose:
 * Receipt detail — immutable payment evidence, document, and send hooks.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
 */

import { useState, useTransition } from "react";
import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deliverReceiptAction } from "@/modules/payments/actions/payment-receipt-actions";
import type { ReceiptDetailView } from "@/modules/payments/types";

type ReceiptDetailProps = {
  data: ReceiptDetailView;
};

export function ReceiptDetail({ data }: ReceiptDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function send(channel: string) {
    setError(null);
    startTransition(async () => {
      const result = await deliverReceiptAction({
        receiptId: data.id,
        channel,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.assign(`/receipts/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/receipts" label="Receipts" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
          <FileTextIcon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{data.receiptNumber}</h1>
          <p className="text-sm text-muted-foreground">Payment received</p>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <p className="text-lg font-semibold">
          {data.currencyCode} {data.amount}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(data.paymentDateTime).toLocaleString()}
        </p>
      </section>

      <section className="rounded-xl border bg-white px-4 text-sm">
        <Row label="Payment method" value={data.methodName} />
        <Row label="Network" value={data.networkName} />
        <Row label="Provider" value={data.providerName} />
        <Row label="Channel" value={data.channelName} />
        <Row label="Reference" value={data.providerTransactionReference} />
        <Row label="Payment" value={data.transactionNumber} />
        <Row label="Sale" value={data.orderNumber} />
        <Row label="Invoice" value={data.invoiceNumber} />
        <Row
          label="Applied"
          value={`${data.currencyCode} ${data.allocatedAmount}`}
        />
        <Row label="Document" value={data.documentId ? "Available" : "Not available"} />
      </section>

      {data.allocations.length > 0 ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Applied to amount due</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.allocations.map((row) => (
              <li key={row.id}>
                {row.allocationNumber}: {data.currencyCode} {row.allocatedAmount}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(buttonVariants(), "h-10")}
          onClick={() => window.print()}
        >
          Print
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          onClick={() => send("EMAIL")}
          disabled={isPending}
        >
          Send by email
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          onClick={() => send("WHATSAPP")}
          disabled={isPending}
        >
          Send on WhatsApp
        </button>
        <Link
          href={`/payments/transactions/${data.paymentTransactionId}`}
          className={cn(buttonVariants({ variant: "secondary" }), "h-10")}
        >
          Open payment
        </Link>
      </div>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-1 border-b py-3 sm:grid-cols-3">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium sm:col-span-2">{value || "—"}</p>
    </div>
  );
}
