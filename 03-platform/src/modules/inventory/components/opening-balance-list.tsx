"use client";

/**
 * Purpose:
 * Operational list of opening-balance documents.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryOpeningBalanceView } from "@/modules/inventory/types";

type OpeningBalanceListProps = {
  documents: InventoryOpeningBalanceView[];
};

export function OpeningBalanceList({ documents }: OpeningBalanceListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Opening balances</h1>
          <p className="text-sm text-muted-foreground">
            Record stock already on hand when you start using inventory. This is not a supplier receipt.
          </p>
        </div>
        <Link href="/inventory/opening-balances/new" className={cn(buttonVariants(), "h-10")}>
          New opening balance
        </Link>
      </div>
      {documents.length === 0 ? (
        <PlatformEmptyState
          title="No opening balances yet"
          description="Create an opening balance for stock that already exists at a location."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {documents.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/opening-balances/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-4 sm:items-center"
              >
                <p className="font-medium">{row.documentNumber}</p>
                <p className="text-sm">{row.locationName}</p>
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
