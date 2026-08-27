"use client";

/**
 * Purpose:
 * Collect a payment against the recorded amount due using simple method labels.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import { useState, useTransition } from "react";
import { BanknoteIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createInvoiceAction } from "@/modules/payments/actions/payment-invoice-actions";
import { initiatePaymentAction } from "@/modules/payments/actions/payment-initiation-actions";
import type {
  InvoicePaymentTermRecord,
  InvoiceView,
  PaymentObligationDetailView,
  PaymentOptionView,
  PaymentTransactionView,
} from "@/modules/payments/types";

type PaymentObligationPanelProps = {
  data: PaymentObligationDetailView;
  invoices?: InvoiceView[];
  paymentTerms?: InvoicePaymentTermRecord[];
};

function uniqueMethods(options: PaymentOptionView[]): PaymentOptionView[] {
  const seen = new Set<string>();
  const unique: PaymentOptionView[] = [];
  for (const option of options) {
    if (seen.has(option.methodId)) {
      continue;
    }
    seen.add(option.methodId);
    unique.push(option);
  }
  return unique;
}

export function PaymentObligationPanel({
  data,
  invoices = [],
  paymentTerms = [],
}: PaymentObligationPanelProps) {
  const methods = uniqueMethods(data.eligibleOptions);
  const [amount, setAmount] = useState(data.outstandingAmount);
  const [error, setError] = useState<string | null>(null);
  const [confirmMethod, setConfirmMethod] = useState<PaymentOptionView | null>(null);
  const [latest] = useState<PaymentTransactionView | null>(
    data.recentTransactions[0] ?? null
  );
  const [termCode, setTermCode] = useState(paymentTerms[0]?.code ?? "NET_30");
  const [isPending, startTransition] = useTransition();
  const activeInvoice = invoices.find(
    (row) => row.status !== "CANCELLED" && row.status !== "CREDITED"
  );

  function pay(option: PaymentOptionView, confirmManual: boolean) {
    setError(null);
    if (!confirmManual && !option.requiresElectronicRail) {
      setConfirmMethod(option);
      return;
    }
    startTransition(async () => {
      const result = await initiatePaymentAction({
        obligationId: data.id,
        methodId: option.methodId,
        amount,
        currency: data.currencyCode,
        idempotencyKey: crypto.randomUUID(),
        confirmManual,
      });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setConfirmMethod(null);
      window.location.assign(`/payments/transactions/${result.data.transaction.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/payments" label="Payments" />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
          <BanknoteIcon className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{data.obligationNumber}</h1>
          <p className="text-sm text-muted-foreground">Sale {data.orderNumber}</p>
        </div>
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount due</p>
          <p className="text-lg font-semibold">
            {data.currencyCode} {data.amountDue}
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

      {latest ? (
        <p className="text-sm" role="status">
          {latest.customerMessage}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{data.paymentStatusLabel}.</p>
      )}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">How the customer can pay</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Payment due: {data.currencyCode} {data.outstandingAmount}. How would you like to pay?
        </p>
        {Number(data.paidAmount) > 0 && Number(data.outstandingAmount) > 0 ? (
          <p className="mt-2 text-sm">
            Remaining: {data.currencyCode} {data.outstandingAmount}
          </p>
        ) : null}
        {Number(data.unallocatedTotal) > 0 ? (
          <p className="mt-2 text-sm">
            {data.currencyCode} {data.unallocatedTotal} received and not yet applied to the amount
            due.
          </p>
        ) : null}
        {Number(data.outstandingAmount) > 0 ? (
          <label className="mt-4 flex max-w-xs flex-col gap-1 text-sm">
            Amount to pay
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-10 rounded-md border px-3"
              inputMode="decimal"
            />
          </label>
        ) : (
          <p className="mt-3 text-sm">This amount due is fully paid.</p>
        )}
        {methods.length === 0 ? (
          <p className="mt-3 text-sm">No payment options are available for this sale.</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {methods.map((option) => (
              <li key={option.methodId}>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline" }), "h-10")}
                  onClick={() => pay(option, false)}
                  disabled={isPending || Number(data.outstandingAmount) <= 0}
                >
                  {Number(data.outstandingAmount) > 0 && Number(data.paidAmount) > 0
                    ? `Pay remaining · ${option.label}`
                    : option.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {confirmMethod ? (
          <div className="mt-4 rounded-lg border bg-slate-50 p-3">
            <p className="text-sm">
              Record {data.currencyCode} {amount} as received in {confirmMethod.label}?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={cn(buttonVariants(), "h-10")}
                onClick={() => pay(confirmMethod, true)}
                disabled={isPending}
              >
                {isPending ? "Saving…" : "Confirm payment received"}
              </button>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "ghost" }), "h-10")}
                onClick={() => setConfirmMethod(null)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {Number(data.outstandingAmount) > 0 || invoices.length > 0 ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-base font-semibold">Invoice</h2>
          {activeInvoice ? (
            <p className="mt-2 text-sm">
              <Link href={`/invoices/${activeInvoice.id}`} className="underline">
                {activeInvoice.invoiceNumber}
              </Link>
              {" · "}
              {activeInvoice.statusLabel}. Outstanding {data.currencyCode}{" "}
              {activeInvoice.outstandingAmount}.
            </p>
          ) : Number(data.outstandingAmount) > 0 ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Bill the remaining amount if the customer will pay later.
              </p>
              <label className="mt-3 flex max-w-xs flex-col gap-1 text-sm">
                Payment terms
                <select
                  value={termCode}
                  onChange={(event) => setTermCode(event.target.value)}
                  className="h-10 rounded-md border px-3"
                >
                  {paymentTerms.map((term) => (
                    <option key={term.code} value={term.code}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-10")}
                disabled={isPending || !termCode}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await createInvoiceAction({
                      obligationId: data.id,
                      paymentTermCode: termCode,
                      idempotencyKey: crypto.randomUUID(),
                    });
                    if (!result.success) {
                      setError(result.error.message);
                      return;
                    }
                    window.location.assign(`/invoices/${result.data.id}`);
                  });
                }}
              >
                Bill remaining
              </button>
            </>
          ) : null}
          {invoices.length > 1 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {invoices.map((row) => (
                <li key={row.id}>
                  <Link href={`/invoices/${row.id}`} className="underline">
                    {row.invoiceNumber}
                  </Link>{" "}
                  {row.statusLabel}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {data.recentTransactions.length > 0 ? (
        <section className="rounded-xl border bg-white">
          <h2 className="px-4 pt-4 text-base font-semibold">Recent payments</h2>
          <ul className="divide-y">
            {data.recentTransactions.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/payments/transactions/${row.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.transactionNumber}</p>
                    <p className="text-sm text-muted-foreground">{row.methodName}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>
                      {row.currencyCode} {row.amount}
                    </p>
                    <p className="text-muted-foreground">{row.statusLabel}</p>
                    {row.status === "SUCCESSFUL" ? (
                      <p className="text-muted-foreground">
                        Applied {row.allocatedAmount}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
