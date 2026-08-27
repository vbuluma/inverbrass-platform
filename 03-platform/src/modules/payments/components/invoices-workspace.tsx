"use client";

/**
 * Purpose:
 * Invoice workspace — list and open customer invoices for the current business.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import { FileTextIcon } from "lucide-react";
import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState, PlatformKpiCard } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceDashboardView } from "@/modules/payments/types";

type InvoicesWorkspaceProps = {
  data: InvoiceDashboardView;
};

export function InvoicesWorkspace({ data }: InvoicesWorkspaceProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <PageBackLink href="/dashboard" label="Dashboard" />
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200">
            <FileTextIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Formal billing for unpaid or credit sales. Fully paid cash sales do not need an
              invoice.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlatformKpiCard label="Invoices" value={String(data.invoiceCount)} />
        <PlatformKpiCard label="Draft" value={String(data.draftCount)} />
        <PlatformKpiCard label="Open" value={String(data.issuedCount)} />
        <PlatformKpiCard label="Overdue" value={String(data.overdueCount)} />
      </div>

      {data.recentInvoices.length === 0 ? (
        <PlatformEmptyState
          title="No invoices yet"
          description="Create an invoice from a sale that still has an amount due. Cash sales that are already paid do not require an invoice."
        />
      ) : (
        <section className="rounded-xl border bg-white">
          <h2 className="px-4 pt-4 text-base font-semibold">Recent invoices</h2>
          <ul className="divide-y">
            {data.recentInvoices.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/invoices/${row.id}`}
                  className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{row.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">Sale {row.orderNumber}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p>
                      {row.currencyCode} {row.outstandingAmount} outstanding
                    </p>
                    <p className="text-muted-foreground">{row.statusLabel}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Need to bill a sale? Open the payment record and choose{" "}
        <Link href="/payments" className={cn(buttonVariants({ variant: "link" }), "h-auto p-0")}>
          Bill remaining
        </Link>
        .
      </p>
    </main>
  );
}
