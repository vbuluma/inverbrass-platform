"use client";

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import type { ReceiptListView } from "@/modules/procurement/types";

type ReceivingListProps = {
  initialRows: ReceiptListView[];
};

export function ReceivingList({ initialRows }: ReceivingListProps) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/procurement" label="Procurement" />
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Receiving</h1>
          <p className="text-sm text-muted-foreground">
            Goods, asset and service fulfilment against purchase orders.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Receipt</th>
              <th className="px-4 py-3">PO</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Handoff</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                  No receipts recorded yet.
                </td>
              </tr>
            ) : (
              initialRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-primary hover:underline" href={`/procurement/receiving/${row.id}`}>
                      {row.receiptNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link className="hover:underline" href={`/procurement/orders/${row.purchaseOrderId}`}>
                      {row.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{row.supplierName}</td>
                  <td className="px-4 py-3">{row.receiptType.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3">{row.receiptDate}</td>
                  <td className="px-4 py-3">{row.statusLabel}</td>
                  <td className="px-4 py-3">{row.handoffStatus ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
