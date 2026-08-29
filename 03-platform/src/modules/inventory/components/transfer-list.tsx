"use client";

/**
 * Purpose:
 * Operational list of stock transfers.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import Link from "next/link";

import { PageBackLink } from "@/components/platform/page-back-link";
import { PlatformEmptyState } from "@/components/platform";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INVENTORY_TRANSFER_STATUS_LABELS } from "@/modules/inventory/constants";
import type { InventoryTransferStatus } from "@/modules/inventory/constants";
import type { InventoryTransferView } from "@/modules/inventory/types";

type TransferListProps = {
  transfers: InventoryTransferView[];
};

function statusLabel(status: string): string {
  return (
    INVENTORY_TRANSFER_STATUS_LABELS[status as InventoryTransferStatus] ?? status
  );
}

export function TransferList({ transfers }: TransferListProps) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <PageBackLink href="/inventory" label="Inventory" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Move available stock between locations. In-transit stock is not available until received.
          </p>
        </div>
        <Link href="/inventory/transfers/new" className={cn(buttonVariants(), "h-10")}>
          New transfer
        </Link>
      </div>
      {transfers.length === 0 ? (
        <PlatformEmptyState
          title="No transfers yet"
          description="Create a transfer to move available stock from one location to another."
        />
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          <li className="hidden grid-cols-8 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
            <span>Transfer #</span>
            <span>From</span>
            <span>To</span>
            <span>Items</span>
            <span>Quantity</span>
            <span>Status</span>
            <span>Requested By</span>
            <span>Date</span>
          </li>
          {transfers.map((row) => (
            <li key={row.id}>
              <Link
                href={`/inventory/transfers/${row.id}`}
                className="grid gap-1 px-4 py-3 hover:bg-slate-50 sm:grid-cols-8 sm:items-center"
              >
                <p className="font-medium">{row.transferNumber}</p>
                <p className="text-sm">{row.sourceLocationName}</p>
                <p className="text-sm">{row.destinationLocationName}</p>
                <p className="text-sm">{row.lineCount}</p>
                <p className="text-sm">{row.totalQuantity}</p>
                <p className="text-sm">{statusLabel(row.status)}</p>
                <p className="text-sm text-muted-foreground">{row.requestedBy ?? "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {(row.requestedAt ?? row.createdAt).toISOString().slice(0, 10)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
