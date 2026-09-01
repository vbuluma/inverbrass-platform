"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import type { PaymentReadyListView } from "@/modules/procurement/types";

type PaymentReadyListProps = {
  initialRows: PaymentReadyListView[];
};

export function PaymentReadyList({ initialRows }: PaymentReadyListProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement/invoices" label="Supplier invoices" />
      <div>
        <h1 className="text-2xl font-semibold">Payment-ready queue</h1>
        <p className="text-sm text-muted-foreground">
          Read-only AP handoff status. Payment execution is handled outside procurement.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Supplier ref</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Handoff</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No payment-ready invoices yet.
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
                  </td>
                  <td className="px-4 py-3">{row.supplierInvoiceNumber}</td>
                  <td className="px-4 py-3">{row.supplierName}</td>
                  <td className="px-4 py-3">{row.dueDate ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.currencyCode} {row.totalAmount}
                  </td>
                  <td className="px-4 py-3">{row.handoffReference ?? row.handoffStatus ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
