"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InvoiceListView } from "@/modules/procurement/types";

type InvoiceListProps = {
  initialRows: InvoiceListView[];
};

export function InvoiceList({ initialRows }: InvoiceListProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement" label="Procurement" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Supplier invoices</h1>
          <p className="text-sm text-muted-foreground">
            Capture, match, and prepare supplier invoices for payment.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/procurement/invoices/payment-ready"
            className={cn(buttonVariants({ variant: "outline" }), "h-10")}
          >
            Payment-ready queue
          </Link>
          <Link href="/procurement/invoices/new" className={cn(buttonVariants(), "h-10")}>
            Capture invoice
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Supplier ref</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">PO</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  No supplier invoices captured yet.
                </td>
              </tr>
            ) : (
              initialRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/procurement/invoices/${row.id}`}
                    >
                      {row.internalInvoiceNumber}
                    </Link>
                    {row.duplicateFlag ? (
                      <span className="ml-2 text-xs text-destructive">Duplicate</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{row.supplierInvoiceNumber}</td>
                  <td className="px-4 py-3">{row.supplierName}</td>
                  <td className="px-4 py-3">
                    {row.purchaseOrderId ? (
                      <Link className="hover:underline" href={`/procurement/orders/${row.purchaseOrderId}`}>
                        {row.poNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{row.invoiceDate}</td>
                  <td className="px-4 py-3">
                    {row.currencyCode} {row.totalAmount}
                  </td>
                  <td className="px-4 py-3">{row.statusLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
