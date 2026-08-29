"use client";

/**
 * Purpose:
 * Operational list of physical stocktakes.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InventoryStocktakeView } from "@/modules/inventory/types";

type StocktakeListProps = {
  stocktakes: InventoryStocktakeView[];
};

function statusLabel(status: string): string {
  if (status === "DRAFT") return "Draft";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "APPROVAL_PENDING") return "Pending approval";
  if (status === "APPROVED") return "Approved";
  if (status === "POSTED") return "Reconciliation posted";
  if (status === "COMPLETED") return "Completed";
  if (status === "REJECTED") return "Rejected";
  if (status === "CANCELLED") return "Cancelled";
  return status;
}

export function StocktakeList({ stocktakes }: StocktakeListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Stocktakes</h1>
          <p className="text-sm text-muted-foreground">
            Count physical stock and post variances so the ledger matches what is on the floor.
          </p>
        </div>
        <Link href="/inventory/stocktakes/new" className={cn(buttonVariants(), "h-10")}>
          New stocktake
        </Link>
      </div>
      {stocktakes.length === 0 ? (
        <PlatformEmptyState
          title="No stocktakes yet"
          description="Start a stocktake to capture a physical count against system quantities."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          <li className="hidden grid-cols-7 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Stocktake #</span>
            <span>Location</span>
            <span>Date</span>
            <span>Status</span>
            <span>Items</span>
            <span>Variances</span>
            <span>+ / −</span>
          </li>
          {stocktakes.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/stocktakes/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-7 sm:items-center"
              >
                <p className="font-medium">{row.documentNumber}</p>
                <p className="text-sm">{row.locationName}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(row.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm">{statusLabel(row.status)}</p>
                <p className="text-sm">{row.lineCount}</p>
                <p className="text-sm">{row.varianceCount}</p>
                <p className="text-sm text-muted-foreground">
                  +{row.totalPositiveVariance} / −{row.totalNegativeVariance}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
