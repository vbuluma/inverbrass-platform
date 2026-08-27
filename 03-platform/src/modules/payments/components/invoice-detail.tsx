"use client";

/**
 * Purpose:
 * Invoice detail — issue, cancel, and show amounts derived from payments applied.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import { useState, useTransition } from "react";
import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cancelInvoiceAction,
  issueInvoiceAction,
} from "@/modules/payments/actions/payment-invoice-actions";
import type { InvoiceDetailView } from "@/modules/payments/types";

type InvoiceDetailProps = {
  data: InvoiceDetailView;
};

export function InvoiceDetail({ data }: InvoiceDetailProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const canIssue = data.status === "DRAFT";
  const canCancel =
    data.status !== "CANCELLED" && data.status !== "PAID" && data.status !== "CREDITED";

  function issue() {
    setError(null);
    startTransition(async () => {
      const result = await issueInvoiceAction({
        invoiceId: data.id,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.assign(`/invoices/${result.data.id}`);
    });
  }

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelInvoiceAction({
        invoiceId: data.id,
        reason,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.assign(`/invoices/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/invoices" label="Invoices" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
          <FileTextIcon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{data.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Sale {data.orderNumber} · {data.statusLabel}
          </p>
        </div>
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice amount</p>
          <p className="text-lg font-semibold">
            {data.currencyCode} {data.invoiceAmount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid</p>
          <p className="text-lg font-semibold">
            {data.currencyCode} {data.paidAmount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding</p>
          <p className="text-lg font-semibold">
            {data.currencyCode} {data.outstandingAmount}
          </p>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-4 text-sm">
        <p>
          Payment terms: {data.paymentTermName}
        </p>
        {data.issueDate ? (
          <p className="mt-1 text-muted-foreground">
            Issued {new Date(data.issueDate).toLocaleDateString()}
            {data.dueDate ? ` · Due ${new Date(data.dueDate).toLocaleDateString()}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">This invoice has not been issued yet.</p>
        )}
        <p className="mt-2">
          <Link href={`/payments/${data.obligationId}`} className="underline">
            Open payment record {data.obligationNumber}
          </Link>
        </p>
      </section>

      {canIssue ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Issue invoice</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Issuing sets the due date from the selected payment terms.
          </p>
          <button
            type="button"
            className={cn(buttonVariants(), "mt-3 h-10")}
            onClick={issue}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Issue invoice"}
          </button>
        </section>
      ) : null}

      {canCancel ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Cancel invoice</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cancelled invoices stay on record. Payments already applied are not erased.
          </p>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            Reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="min-h-20 rounded-md border px-3 py-2"
            />
          </label>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-10")}
            onClick={cancel}
            disabled={isPending || reason.trim().length === 0}
          >
            Cancel invoice
          </button>
        </section>
      ) : null}

      {data.adjustments.length > 0 ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Adjustments</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {data.adjustments.map((row) => (
              <li key={row.id}>
                {row.adjustmentType}: {data.currencyCode} {row.amount} — {row.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </main>
  );
}
