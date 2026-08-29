"use client";

/**
 * Purpose:
 * Operational list of stock receipts.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryReceiptView } from "@/modules/inventory/types";

type ReceiveStockListProps = {
  receipts: InventoryReceiptView[];
};

export function ReceiveStockList({ receipts }: ReceiveStockListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Receive stock</h1>
          <p className="text-sm text-muted-foreground">
            Record supplier deliveries into inventory. Stock increases only after posting.
          </p>
        </div>
        <Link href="/inventory/receive/new" className={cn(buttonVariants(), "h-10")}>
          New receipt
        </Link>
      </div>
      {receipts.length === 0 ? (
        <PlatformEmptyState
          title="No receipts yet"
          description="Create a receipt when goods arrive, then post it to update stock."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {receipts.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/receive/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-5 sm:items-center"
              >
                <p className="font-medium">{row.documentNumber}</p>
                <p className="text-sm">{row.locationName}</p>
                <p className="text-sm">{row.supplierName ?? "No supplier"}</p>
                <p className="text-sm">{row.status}</p>
                <p className="text-sm text-muted-foreground">
                  {row.lineCount} items · {row.totalQuantity}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
