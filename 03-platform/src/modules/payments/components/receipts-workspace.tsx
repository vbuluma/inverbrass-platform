"use client";

/**
 * Purpose:
 * Receipt history workspace for issued payment evidence.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
 */

import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import type { ReceiptDashboardView } from "@/modules/payments/types";

type ReceiptsWorkspaceProps = {
  data: ReceiptDashboardView;
};

export function ReceiptsWorkspace({ data }: ReceiptsWorkspaceProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/payments" label="Payments" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <FileTextIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Receipts</h1>
            <p className="text-sm text-muted-foreground">
              Evidence of payments received. A receipt is created after a payment succeeds.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PlatformKpiCard label="Receipts" value={String(data.receiptCount)} />
      </div>

      {data.recentReceipts.length === 0 ? (
        <PlatformEmptyState
          title="No receipts yet"
          description="Receipts appear after a payment is successful."
        />
      ) : (
        <section className="rounded-xl border bg-white">
          <h2 className="px-4 pt-4 text-base font-semibold">Recent receipts</h2>
          <ul className="divide-y">
            {data.recentReceipts.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/receipts/${row.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.receiptNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {row.transactionNumber} · {row.methodName || "Payment"}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>
                      {row.currencyCode} {row.amount}
                    </p>
                    <p className="text-muted-foreground">{row.statusLabel}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
