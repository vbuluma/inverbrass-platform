"use client";

/**
 * Purpose:
 * Payment foundation workspace — amount due from a confirmed sale,
 * and simple payment-method labels for later collection.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { useState, useTransition } from "react";
import { BanknoteIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import {
  PlatformEmptyState,
  PlatformHubSections,
  PlatformKpiCard,
} from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPaymentObligationAction } from "@/modules/payments/actions/payment-obligation-actions";
import type { PaymentDashboardView } from "@/modules/payments/types";

type PaymentsWorkspaceProps = {
  data: PaymentDashboardView;
};

export function PaymentsWorkspace({ data }: PaymentsWorkspaceProps) {
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createPaymentObligationAction({ orderId });
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      window.location.assign(`/payments/${result.data.id}`);
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <BanknoteIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Payments</h1>
            <p className="text-sm text-muted-foreground">
              Record the amount due from a confirmed sale, then invoice, collect, and receipt.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Payment records" value={String(data.obligationCount)} />
        <PlatformKpiCard label="Not started" value={String(data.notStartedCount)} />
        <PlatformKpiCard label="Part paid" value={String(data.partialCount ?? 0)} />
        <PlatformKpiCard label="Still due" value={String(data.outstandingCount ?? 0)} />
      </div>

      <PlatformHubSections
        sections={[
          {
            title: "Collect and record",
            links: [
              {
                href: "/invoices",
                label: "Invoices",
                description: "Bills issued against amounts due.",
              },
              {
                href: "/receipts",
                label: "Receipts",
                description: "Evidence of payments received.",
              },
              {
                href: "/payments/exceptions",
                label: "Payment reviews",
                description: "Exceptions and issues that need attention.",
              },
            ],
          },
        ]}
      />

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-base font-semibold">Record amount due</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a confirmed sale. The amount and currency come from that sale and cannot be typed in.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Sale reference
            <input
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className="h-10 rounded-md border px-3"
              placeholder="Confirmed sale ID"
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className={cn(buttonVariants(), "h-10")}
            onClick={onCreate}
            disabled={isPending || !orderId.trim()}
          >
            {isPending ? "Saving…" : "Record amount due"}
          </button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {data.recentObligations.length === 0 ? (
        <PlatformEmptyState
          title="No payment records yet"
          description="Record the amount due from a confirmed sale to get started."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {data.recentObligations.map((row) => (
            <li key={row.id}>
              <Link
                href={`/payments/${row.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.obligationNumber}</p>
                  <p className="text-sm text-muted-foreground">Sale {row.orderNumber}</p>
                </div>
                <div className="text-sm sm:text-right">
                  <p>
                    {row.currencyCode} {row.amountDue}
                  </p>
                  <p className="text-muted-foreground">{row.paymentStatusLabel}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
